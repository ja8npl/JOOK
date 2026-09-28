# Gym Log (JOOK): iPhone-PWA (Gym-Tagebuch)

> Diese Datei liegt im Repo und gilt projektweit. Sie entspricht der AGENTS.md im
> Workspace-Root (`C:\JOOK`); bei Änderungen beide synchron halten.

## Ziel
Kostenlose iPhone-PWA als Gym-Tagebuch: Einträge pro Übung (Einstellung, Probleme, Ziel), Warm-up-Rechner, History, Rep-/Set-Counter, Pausen-Timer, Kraftanalyse, Plan-Import per Foto. Alle Daten lokal in Dexie (IndexedDB). Muss offline laufen und sich auf dem iPhone wie eine native App anfühlen.

## Qualitätsanspruch
Hochwertig auf Apple/Whoop/Bevel-Niveau, kein "AI Slop": keine Standard-Blautöne, keine Icon-in-Box-Cards, keine generischen Onboarding-Muster, keine Platzhalter. Das aktuelle Design gefällt dem Nutzer: bestehende Screens nicht ungefragt umbauen, nur gezielt ändern.

## Stack
React 19, TypeScript, Vite, Tailwind 4, react-router (HashRouter), framer-motion, recharts, lucide-react, Dexie, vite-plugin-pwa. Deployment auf Vercel, alles kostenlos. Neue Abhängigkeiten nur nach Rückfrage.

## Design und Themes
- Theme-System über data-theme und CSS-Tokens in src/index.css: garmin (Standard, Lime), bordeaux, whoop, ember (3C1518, 69140E, A44200, D58936, F2F3AE).
- Neue UI nur mit Tokens (inkl. --neo-*), keine hartkodierten Farben. Jedes neue Feature muss in allen vier Themes gut aussehen.
- Glassmorphism/Neumorphism des Bestands beibehalten. Das hat Vorrang vor Skill-Regeln, die ihn verbieten.
- Spring-Animationen mit Framer Motion, Bottom-Sheets, Touch-Ziele mind. 44px.

## Skills
Immer nutzen: design-taste-frontend, impeccable, emil-design-eng, vitest.
Bei Bedarf (falls installiert): iphone-ui-pro für Safe Areas, Tastatur und Tab-Bar; react-doctor einmal vor Abschluss einer Aufgabe; full-output-enforcement gegen abgekürzten Code.
Nach größeren UI-Änderungen impeccable audit und polish. Bei Widersprüchen gilt: diese AGENTS.md > taste > impeccable > emil.

## MCPs
- Playwright: Nach jeder UI-Änderung iPhone-Viewport 390×844 (Touch, DPR 3), Screenshots der betroffenen Screens prüfen auf Overflow, Abschneiden, Tab-Bar-Überlappung, Konsolenfehler. Maximal 3 Durchläufe, Screenshots in `_local/screenshots/` (außerhalb des Repos). Playwright emuliert keine Safe Areas: bei Layout-Änderungen auf einen Test am echten iPhone hinweisen.
- Figma: nur lesend (figma-token), nur wenn eine URL angegeben ist.

## Daten
Dexie-Schemaänderungen immer mit neuer Versionsnummer und Upgrade-Pfad, bestehende Nutzerdaten dürfen nie verloren gehen.

## Tests
Reine Logik-Funktionen (z. B. Warm-up-Rechner, 1RM, Muster-Erkennung, Gewichts-Delta) mit Vitest testen. Vor Abschluss einer Aufgabe npm run build und npm test ausführen.

## Backend
api/parse-plan.ts (OpenRouter, Vercel-Limit 60 s): Modellketten mit Timeout pro Modell. Nie Secrets oder API-Keys ausgeben (OPENROUTER_API_KEY nur per Name erwähnen).

## Regeln
- Texte und UI auf Deutsch.
- Bei Unklarheit kurz nachfragen, keine großen Umbauten auf Verdacht.
- Ergebnis immer vollständig liefern, keine "// Rest bleibt gleich"-Kommentare.
