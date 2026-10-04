# AGENTS.md – JOOK (Gym Log), iPhone-PWA

> Repo: github.com/ja8npl/JOOK (Branch `main`). Deploy: Push auf `main` → Vercel-Projekt `gym-log` (https://gym-log-virid.vercel.app). Diese Datei ist die EINZIGE Quelle der Wahrheit — die AGENTS.md im Workspace-Root (`C:\JOOK`) ist nur noch ein Verweis hierher und wird nicht mehr gepflegt.

Antworte auf Deutsch, kurz und konkret. Code/Commits auf Englisch.

## Was die App ist
Offline-fähiges Gym-Tagebuch als PWA. Alle Trainingsdaten lokal in Dexie/IndexedDB, kein Account, kein Server für Nutzerdaten. Kern: Einträge pro Übung (Einstellung, Problem, Ziel), Sätze mit Gewicht/Reps/RIR, Warm-up-Rechner, Pausen-Timer mit Satzpausen-Leiste, Rep-Ziel pro Übung mit Steigerungs-Signal (3 Modi: Kraft/Größe/Ausdauer), Fortschritts-Charts, Plan-Import per Foto über `api/parse-plan.ts` (OpenRouter).

## Qualitätsanspruch
Apple/Whoop/Bevel-Niveau, kein „AI Slop" (keine Standard-Blautöne, keine Icon-in-Box-Cards, keine generischen Onboarding-Muster). **Das aktuelle Design (V2 „Night Graphite" + Plush Layering) gefällt Jan.** Bestehende Screens nicht ungefragt umbauen oder „verbessern" – nur das ändern, was die Aufgabe verlangt. Bei größeren visuellen Eingriffen vorher kurz Rückfrage.

## Stack (Ist-Stand)
React 19.2, TypeScript ~6.0, Vite 8.3, Tailwind CSS 4.3, framer-motion 13.3, recharts 3.10 (lazy geladen), lucide-react, react-router-dom 7 (HashRouter), Dexie 4.4 + dexie-react-hooks, vite-plugin-pwa 1.3 (Workbox), Vitest 5, oxlint. Neue Abhängigkeiten nur nach Rückfrage.
Befehle: `npm run dev` · `npm run build` (tsc -b && vite build) · `npm test` (vitest run) · `npm run lint` (oxlint) · `npm run preview`.

## Design-System
- 4 Themes über `data-theme`, **alle Dark**, Tokens zentral in `src/index.css`: `garmin` (Standard, Lime), `bordeaux`, `whoop`, `ember` — jede Theme-Datei hat eine eigene Near-Black-Ramp (V2 „Night Graphite").
- Nur Tokens verwenden (Farben, `--radius-*`, `--neo-*`), keine neuen hartkodierten Hex-Werte. Jedes neue UI-Stück muss in allen vier Themes funktionieren.
- Aktuelles Material: „Plush Layering" mit verstärkten Lichtkanten — weiche Schatten von oben, geformte Flächen, feine Hairlines statt Outlines.
- Viele Screens stylen komplett inline statt über Klassen – bei Änderungen an diesen Dateien den bestehenden Stil beibehalten.

## Arbeitsablauf (jede Aufgabe)
1. Start: Behavioral (immer). Aufgabe in 1–2 Sätzen wiederholen, HANDOFF.md lesen.
2. Neu oder unklar? Erst Research (Docs, Library, Browser-APIs prüfen, nicht raten). Passt kein Skill? Find skills.
3. Umsetzen mit Skill-Routing (max. 3 Skills pro Aufgabe):
   - Neues UI/Look: Taste v2 → impeccable (+ UI UX Pro Max bei Layout/Farbe)
   - Bestehendes UI: Improve UI → impeccable
   - Animation: Emil Kowalski → Improve animations
   - React-Qualität: Improve React
   - iPhone/PWA: mobile-native → apple-design
   - Barrierefreiheit/UX: Web accessibility, UX design
   - Bugfix/Logik: keine Design-Skills
4. Texte und Mikrotexte in der App: Stop slop.
5. Prüfen: review-animations, webapp-testing, vitest, Build und Lint.
6. Ende: HANDOFF.md aktualisieren (Stand, offene Probleme, nächste Schritte), kurze Abschlussmeldung.
Skill creator nur, wenn ich ausdrücklich einen neuen Skill will.

## Aktive Skills (C:\JOOK\.agents\skills)
apple-design · design-system · design-taste-frontend (= **Taste v2**) · emil-design-eng (= **Emil Kowalski**) · find-skills (= **Find skills**) · frontend-design · impeccable · improve-animations (= **Improve animations**) · mobile-native · review-animations · ui-styling (= **Improve UI**) · ui-ux-pro-max (= **UI UX Pro Max**) · vercel-react-best-practices (= **Improve React**) · vitest · webapp-testing.
**Skill creator** läuft als ZCode-Plugin (immer verfügbar). **Behavioral, Research, Stop slop, UX design, Web accessibility, UI skills route, CSS animations** sind noch nicht installiert (Quellen offen — siehe HANDOFF.md). Alle übrigen früheren Skills liegen ungelöscht im Pool: `C:\JOOK\_skills-pool`.
Bei Widersprüchen gilt: diese AGENTS.md > Task-Skills.

## Daten
Dexie-DB `GymLogDB`, aktuell **Version 8** (`src/db/schema.ts`, `src/db/db.ts`): v7 `repTargets` (Rep-Ziel-Override pro Übung), v8 `restTargets` (Pausenzeit-Override pro Übung). Schema-Änderungen **immer** mit neuer Versionsnummer + nicht-destruktivem Upgrade-Pfad – bestehende Trainingsdaten dürfen nie verloren gehen. Nicht in Dexie: Workout-Vorlagen, aktive Session, Theme, Pausen-Dauer, RIR-Default, Timer-Sound/Vibration – die liegen in `localStorage`, das beim Ändern von Backup/Export mitdenken.

## Bekannter Backlog (Stand 04.10.)
1. **Backup/Import ersetzt Daten weiterhin per `clear()` + `bulkAdd`** (vorher läuft automatisch eine Notfall-Sicherung). Export ist vollständig (alle Tabellen inkl. repTargets/restTargets + localStorage).
2. ~~RestTimer läuft im iOS-Hintergrund falsch~~ – **erledigt**: Session-Pausen-Leiste arbeitet mit Wall-Clock-Deadline (`Date.now()`), nicht mit Zählern.
3. ~~TypeScript `strict`~~ – **erledigt** (Commit „Harden code").
4. ~~Warmup-Komma-Eingaben~~ – **erledigt** (parser `parseKgInput`).
5. ~~Datum/Zeitzone in EntryForm~~ – **erledigt** (lokale Tages-Key-Helfer).
6. Offline-Fonts (Fontshare: Satoshi, General Sans, Cabinet Grotesk) nicht im Service-Worker-Cache.
7. ~~theme-color beim Kaltstart~~ – **erledigt** (pro Theme, Boot-Script + Meta).
8. ~~Inputs unter 16px im Plan-Import~~ – **erledigt** (globales 16px-Input-Regelwerk).
Wenn keine konkrete Aufgabe vorgegeben ist und nach dem nächsten sinnvollen Schritt gefragt wird: HANDOFF.md „Nächste Schritte" lesen.

## iPhone-Pflichtcheckliste (bei jeder Layout-Änderung erneut prüfen)
- Viewport-Meta mit `viewport-fit=cover`, Standalone-Metas, Manifest, apple-touch-icon: vorhanden (`index.html`).
- Höhe über `100vh` + `position: fixed; inset:0` auf der App-Shell (`App.tsx`), Sheets nutzen `dvh`. Kein `h-screen`.
- Tab-Bar ist `position: fixed`, schwebt bewusst über halbem Safe-Area-Inset + 6px – das ist Design, kein Bug. Bei einer wahrgenommenen „Lücke": zuerst `src/pwa.ts` (Scroll-Restore-Fix) prüfen, dann am echten Gerät messen.
- Kein `transition: all` im Projekt – so beibehalten.
- Alle neuen Inputs ≥ 16px Schriftgröße, `inputmode` passend zum Feld.

## Harte Regeln
- Nur ändern, was die Aufgabe braucht. Kein Redesign, kein Refactoring nebenbei.
- Keine ganzen Dateien neu schreiben, wenn ein kleiner Diff reicht. Kein „// Rest bleibt gleich" – Ergebnis immer vollständig.
- Nichts löschen (Dateien, Daten, Migrationen) ohne Rückfrage.
- Keine Secrets committen, keine Env-Werte ausgeben.
- `_local/` (falls vorhanden) ist lokal/gitignored – nie ins Repo.

## MCPs
- **github**: Repo-/Issue-/PR-Status.
- **vercel**: Deployment-Status, Build-Logs, Vercel-Doku, Env-Variablen-Übersicht (nie Werte ausgeben).
Kein Figma-, Stitch- oder Playwright-MCP verbunden. Wird einer davon später hinzugefügt, diese Datei entsprechend ergänzen.

## Backend
`api/parse-plan.ts` (OpenRouter, Vercel-Limit 60 s): Modellketten mit Timeout pro Modell. Env-Variable heißt `OPENROUTER_API_KEY` – nur den Namen erwähnen, nie den Wert ausgeben oder loggen.

## Abschlussmeldung nach jeder Aufgabe
1. Was geändert wurde (max. 3 Sätze).
2. Welche Skills und MCPs wirklich benutzt wurden.
3. Was geprüft wurde (Tests/Build/Lint) und was Jan noch selbst am iPhone testen sollte (3–5 konkrete Punkte).
