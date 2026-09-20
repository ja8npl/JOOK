/**
 * Service für „Plan importieren": Bildkomprimierung (Canvas), API-Client für
 * /api/parse-plan und Übungsmatching gegen die lokale Bibliothek.
 */

export type PlanImportErrorCode =
  | 'invalid_request'
  | 'too_large'
  | 'nothing_found'
  | 'rate_limit'
  | 'model_unreachable';

export class PlanImportError extends Error {
  readonly code: PlanImportErrorCode;

  constructor(code: PlanImportErrorCode, message: string) {
    super(message);
    this.name = 'PlanImportError';
    this.code = code;
  }
}

/** Verständliche Fehlermeldung pro Fehlercode — vom Sheet direkt angezeigt. */
export function planImportErrorMessage(code: PlanImportErrorCode): string {
  switch (code) {
    case 'rate_limit':
      return 'Das kostenlose KI-Kontingent ist gerade ausgeschöpft. Bitte in ein paar Minuten erneut versuchen.';
    case 'too_large':
      return 'Der Text oder das Bild ist zu groß. Bitte kürzen oder ein kleineres Foto wählen.';
    case 'nothing_found':
      return 'Es wurde kein Trainingsplan erkannt. Bitte einen klar lesbaren Plan oder ein vollständiges Foto verwenden.';
    case 'model_unreachable':
      return 'Die KI-Modelle sind momentan nicht erreichbar. Bitte später erneut versuchen.';
    case 'invalid_request':
      return 'Die Anfrage konnte nicht gesendet werden. Bitte Text oder Bild prüfen und erneut versuchen.';
  }
}

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.8;

/**
 * Bild vor dem Upload im Browser verkleinern: max. 1400px Kantenlänge,
 * als JPEG (Qualität 0.8) komprimiert — schont das Vercel-Body-Limit.
 * Rückgabe als Data-URL (data:image/jpeg;base64,…).
 */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new PlanImportError('invalid_request', 'Bitte eine Bilddatei (Foto oder Screenshot) wählen.');
  }

  const bitmap = await createImageBitmap(file).catch(async () => {
    // Fallback für Formate ohne createImageBitmap-Support (z. B. ältere Safari-Versionen)
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new PlanImportError('invalid_request', 'Das Bild konnte nicht gelesen werden.'));
        image.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  if (!sourceWidth || !sourceHeight) {
    throw new PlanImportError('invalid_request', 'Das Bild konnte nicht gelesen werden.');
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new PlanImportError('invalid_request', 'Das Bild konnte nicht verarbeitet werden.');
  context.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (dataUrl.length > 3_000_000) {
    throw new PlanImportError('too_large', 'Das Bild ist auch komprimiert noch zu groß. Bitte ein kleineres Foto wählen.');
  }
  return dataUrl;
}

export interface ParsedPlanTemplate {
  name: string;
  exercises: string[];
}

interface ParsePlanResponse {
  templates?: ParsedPlanTemplate[];
  error?: { code?: string; message?: string };
}

/**
 * Trainingsplan-Text und/oder komprimiertes Bild an die Serverless-Function
 * schicken und die erkannten Vorlagen zurückgeben.
 */
export async function parsePlan(input: { text?: string; imageDataUrl?: string }): Promise<ParsedPlanTemplate[]> {
  const body: Record<string, string> = {};
  if (input.text?.trim()) body.text = input.text.trim();
  if (input.imageDataUrl) body.imageBase64 = input.imageDataUrl;

  let response: Response;
  try {
    response = await fetch('/api/parse-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PlanImportError('model_unreachable', planImportErrorMessage('model_unreachable'));
  }

  let payload: ParsePlanResponse | null = null;
  try {
    payload = (await response.json()) as ParsePlanResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const code = (payload?.error?.code ?? '') as PlanImportErrorCode;
    const known = ['invalid_request', 'too_large', 'nothing_found', 'rate_limit', 'model_unreachable'] as const;
    const resolved = known.includes(code as (typeof known)[number]) ? code : 'model_unreachable';
    throw new PlanImportError(resolved, payload?.error?.message ?? planImportErrorMessage(resolved));
  }

  const templates = Array.isArray(payload?.templates) ? payload!.templates : [];
  if (templates.length === 0) {
    throw new PlanImportError('nothing_found', planImportErrorMessage('nothing_found'));
  }
  return templates;
}
