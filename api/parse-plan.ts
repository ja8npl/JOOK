/**
 * Vercel Serverless Function: POST /api/parse-plan
 *
 * Erwartet { text?: string, imageBase64?: string } (mindestens eines von beiden)
 * und liefert { templates: [{ name, exercises: string[] }] } zurück.
 *
 * Der OpenRouter-Key liegt ausschließlich in process.env.OPENROUTER_API_KEY
 * (Vercel Environment Variables bzw. lokale .env.local) — niemals im Frontend.
 *
 * Fehlercodes (JSON { error: { code, message } }):
 *  - invalid_request   400  Kein Text und kein Bild übergeben / kein gültiges JSON
 *  - too_large         413  Text/Bild überschreitet die Limits
 *  - nothing_found     422  Modell konnte keinen Plan erkennen
 *  - rate_limit        429  OpenRouter-Free-Tier ausgereizt
 *  - model_unreachable 5xx  Modell/Netzwerk/Timeout/Server-Fehlkonfiguration
 */

export const maxDuration = 60;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Modell-Ketten in Prioritätsreihenfolge — bei jedem Fehler wird das nächste probiert.
 * Bild: ling-3.0-flash-vl (schnellster Vision-Parser, ~7 s), Fallback nex-n2.5-pro (~20 s).
 * Text: nemotron-3-ultra (550B, bestes Text-Parsing inkl. Multi-Day-Plänen, ~45 s), Fallback ling.
 * Hinweis: openrouter/free ist NICHT geeignet — liefert für Bilder nur "User Safety: safe".
 */
const IMAGE_MODELS = [
  'inclusionai/ling-3.0-flash-vl:free',
  'nex-agi/nex-n2.5-pro:free',
];

const TEXT_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash-vl:free',
];

/** Timeout pro Modellversuch: Ultra ist langsam (~48 s gemessen), Vision-Modelle schnell. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const SLOW_TEXT_TIMEOUT_MS = 50_000;

const PROMPT =
  'Lies den Trainingsplan aus Text und/oder Bild. Antworte NUR mit gültigem JSON, ohne Markdown, Erklärungen oder Zusatztext. ' +
  'Format: {"templates":[{"name":"Name des Plans","exercises":["Übung 1","Übung 2"]}]}. ' +
  'Regeln: Jede Übung als klarer, vollständiger Übungsname — ohne Sätze, Wiederholungen oder Gewichtsangaben. ' +
  'Sind mehrere Tage oder Pläne erkennbar, lege pro Tag eine Vorlage mit aussagekräftigem Namen an (z. B. "Push Day"). ' +
  'Behalte die Sprache des Plans bei (Deutsch bevorzugt). Ist kein Trainingsplan erkennbar, antworte {"templates":[]}.';

const MAX_TEXT_LENGTH = 12_000;
/** ~2,7 MB Binärdaten als Base64 — bleibt sicher unter dem Vercel-Body-Limit. */
const MAX_IMAGE_BASE64_LENGTH = 3_600_000;
/** Gesamtbudget über alle Modellversuche — Function-Limit 60 s nicht reißen. */
const TOTAL_BUDGET_MS = 56_000;
const MAX_TEMPLATES = 8;
const MAX_EXERCISES_PER_TEMPLATE = 30;

type ErrorCode = 'invalid_request' | 'too_large' | 'nothing_found' | 'rate_limit' | 'model_unreachable';

interface ParsePlanRequest {
  text?: string;
  imageBase64?: string;
}

interface ParsedTemplate {
  name: string;
  exercises: string[];
}

type AttemptResult =
  | { ok: true; templates: ParsedTemplate[] }
  | { ok: false; code: ErrorCode };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function errorResponse(code: ErrorCode, status: number, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

/** JSON-Block aus Modell-Antwort extrahieren (fence-tolerant, sucht erstes/letztes Klammer-Paar). */
function extractJsonBlock(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim()) text = fence[1].trim();

  const candidates = [text];
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // nächsten Kandidaten probieren
    }
  }
  return undefined;
}

/** Modell-Antwort auf { templates: [{ name, exercises }] } normalisieren. */
function normalizeTemplates(data: unknown): ParsedTemplate[] {
  const root = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const list = Array.isArray(root.templates)
    ? root.templates
    : Array.isArray(root.plans)
      ? root.plans
      : Array.isArray(data)
        ? data
        : [];

  const templates: ParsedTemplate[] = [];
  for (const entry of list.slice(0, MAX_TEMPLATES)) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const rawExercises = Array.isArray(record.exercises) ? record.exercises : Array.isArray(record.uebungen) ? record.uebungen : [];
    const exercises: string[] = [];
    for (const item of rawExercises.slice(0, MAX_EXERCISES_PER_TEMPLATE)) {
      if (typeof item !== 'string') continue;
      // Sätze/Wiederholungen entfernen (z. B. "Bankdrücken 3x10" → "Bankdrücken") —
      // reine Zahlen bleiben stehen ("45-Grad-Beinpresse").
      const name = item
        .replace(/\s*\d+\s*[x×]\s*\d+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!name) continue;
      if (exercises.some((existing) => existing.toLowerCase() === name.toLowerCase())) continue;
      exercises.push(name);
    }
    if (exercises.length === 0) continue;
    const rawName = typeof record.name === 'string' ? record.name.replace(/\s+/g, ' ').trim() : '';
    templates.push({ name: rawName || `Trainingsplan ${templates.length + 1}`, exercises });
  }
  return templates;
}

/** Nachrichtenteile für OpenRouter: Prompt + optionaler Plan-Text, Bild als Data-URL. */
function buildContent(request: ParsePlanRequest): Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
  const parts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
  const textPart = request.text?.trim()
    ? `${PROMPT}\n\nTrainingsplan als Text:\n"""\n${request.text.trim()}\n"""`
    : PROMPT;
  parts.push({ type: 'text', text: textPart });

  const image = request.imageBase64?.trim();
  if (image) {
    const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
    parts.push({ type: 'image_url', image_url: { url: dataUrl } });
  }
  return parts;
}

async function attemptModel(model: string, request: ParsePlanRequest, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<AttemptResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, code: 'model_unreachable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Gym Log',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildContent(request) }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      // 429 und 404 sind modellspezifisch → nächstes Modell; Status fürs finale Mapping merken.
      console.error(`[parse-plan] ${model} → HTTP ${response.status}`);
      return { ok: false, code: response.status === 429 ? 'rate_limit' : 'model_unreachable' };
    }

    const payload = (await response.json().catch(() => null)) as { choices?: Array<{ message?: { content?: unknown; reasoning?: string } }> } | null;
    const message = payload?.choices?.[0]?.message;
    let content = typeof message?.content === 'string' ? message.content : '';
    if (Array.isArray(message?.content)) {
      content = message.content
        .map((part) => (part && typeof part === 'object' && 'text' in part ? String((part as { text?: unknown }).text ?? '') : ''))
        .join('');
    }
    if (!content.trim() && typeof message?.reasoning === 'string') content = message.reasoning;

    const parsed = extractJsonBlock(content);
    if (parsed === undefined) {
      console.error(`[parse-plan] ${model} → ungültiges JSON`);
      return { ok: false, code: 'model_unreachable' };
    }

    const templates = normalizeTemplates(parsed);
    if (templates.length === 0) return { ok: false, code: 'nothing_found' };
    return { ok: true, templates };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error(`[parse-plan] ${model} → ${aborted ? 'Timeout' : 'Netzwerkfehler'}`);
    return { ok: false, code: 'model_unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Benannter POST-Export (Vercel Web-Signatur) — andere Methoden beantwortet Vercel automatisch mit 405. */
export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('invalid_request', 405, 'Nur POST-Anfragen werden unterstützt.');
  }

  let body: ParsePlanRequest;
  try {
    body = (await request.json()) as ParsePlanRequest;
  } catch {
    return errorResponse('invalid_request', 400, 'Die Anfrage enthält kein gültiges JSON.');
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  if (!text && !imageBase64) {
    return errorResponse('invalid_request', 400, 'Bitte Text einfügen oder ein Foto des Trainingsplans wählen.');
  }
  if (text.length > MAX_TEXT_LENGTH || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return errorResponse('too_large', 413, 'Der Text oder das Bild ist zu groß. Bitte kürzen bzw. ein kleineres Foto wählen.');
  }

  const startedAt = Date.now();
  const failureCodes: ErrorCode[] = [];
  // Erster Versuch bekommt den langen Timeout (Ultra braucht ~48 s), Rettungsversuche laufen mit dem Default.
  const chain = imageBase64 ? IMAGE_MODELS : TEXT_MODELS;
  for (let i = 0; i < chain.length; i++) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    const timeout = Math.min(i === 0 ? SLOW_TEXT_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS, remaining);
    if (timeout < 5_000) break;
    const result = await attemptModel(chain[i], { text, imageBase64 }, timeout);
    if (result.ok) return jsonResponse(200, { templates: result.templates });
    failureCodes.push(result.code);
  }

  if (failureCodes.includes('rate_limit')) {
    return errorResponse('rate_limit', 429, 'Das kostenlose Modell-Kontingent ist derzeit ausgeschöpft. Bitte in wenigen Minuten erneut versuchen.');
  }
  if (failureCodes.length > 0 && failureCodes.every((code) => code === 'nothing_found')) {
    return errorResponse('nothing_found', 422, 'Es wurde kein Trainingsplan erkannt. Bitte einen klaren Plan-Text oder ein vollständiges Foto verwenden.');
  }
  return errorResponse('model_unreachable', 502, 'Die KI-Modelle sind momentan nicht erreichbar. Bitte später erneut versuchen.');
}
