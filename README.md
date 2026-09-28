# JOOK — Gym-Tagebuch als iPhone-PWA

JOOK (ehemals „Gym Log") ist eine kostenlose iPhone-PWA als Gym-Tagebuch: Einträge pro Übung (Einstellung, Probleme, Ziel), Warm-up-Rechner, History, Rep-/Set-Counter, Pausen-Timer, Kraftanalyse und Plan-Import per Foto. Alle Daten liegen lokal in Dexie (IndexedDB) — die App läuft komplett offline.

**Prod-URL:** https://gym-log-virid.vercel.app · Deploy per Git-Push auf `main` (Vercel-Projekt `gym-log`, Git-Integration).

## Stack

React 19 · TypeScript · Vite · Tailwind 4 · react-router (HashRouter) · framer-motion · recharts · lucide-react · Dexie · vite-plugin-pwa

## Projektstruktur

```
.
├── api/                # Vercel Serverless Functions (OpenRouter)
│   └── parse-plan.ts   # Plan-Import per Foto (Modellketten mit Timeout pro Modell)
├── public/             # Statische Assets: Icons, Splash-Screens, Manifest
├── scripts/            # Einmal-Skripte (Übungen fetchen, Splash-Screens generieren)
├── src/
│   ├── assets/         # Statische Assets im Bundle
│   ├── components/     # Wiederverwendbare UI-Komponenten
│   ├── data/           # Statische App-Daten (Übungskatalog)
│   ├── db/             # Dexie-Schema + Migrationen
│   ├── hooks/          # React-Hooks (u. a. useTrainingStats)
│   ├── lib/            # Reine Logik (Warm-up-Rechner, 1RM, Progression)
│   │   └── prompts/    # KI-Prompts + Wissensbasis (sfkt-rules.md)
│   ├── pages/          # Screens (Routing)
│   ├── services/       # API-Clients
│   └── theme/          # Theme-System (garmin, bordeaux, whoop, ember)
├── knowledge/
│   └── sfkt/           # Quellenliteratur (SFKT.pdf, ACSM 2026/2009)
├── index.html
├── vite.config.ts      # Vite + PWA-Konfiguration
└── vercel.json         # Rewrites + Cache-Header
```

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server (API-Proxy aufs Prod, siehe vite.config.ts)
npm test          # Vitest: Warm-up-Rechner, 1RM, Progression, Prompt-Guards
npm run build     # tsc -b && vite build (PWA nach dist/)
npm run lint      # oxlint
```

## Wichtige Konventionen

- **Themes:** Alle Farben über CSS-Tokens (`src/index.css`, `data-theme`) — garmin, bordeaux, whoop, ember. Keine hartkodierten Farben; jedes Feature muss in allen vier Themes funktionieren.
- **Daten:** Dexie-Schemaänderungen immer mit neuer Versionsnummer und datenverlustfreiem Upgrade-Pfad.
- **Tests:** Reine Logik-Funktionen mit Vitest abdecken; vor jedem Abschluss `npm run build && npm test`.
- **KI-Prompts:** Regeln nur aus `knowledge/sfkt/SFKT.pdf` (aufbereitet in `src/lib/prompts/knowledge/sfkt-rules.md`); Lücken werden gekennzeichnet, nicht gefüllt. Guard-Tests in `src/lib/sfkt-prompt.test.ts`.
- **Deployment:** Push auf `main` → Vercel baut automatisch.

## Arbeitsweise mit KI-Agenten

`AGENTS.md` im Repo-Root enthält Projektkonventionen für Coding-Agenten (Design-Regeln, Skills, Playwright-Verifikation).

## Daten & Backup

Alle Trainingsdaten liegen lokal im Browser (IndexedDB). Export als JSON-Backup über die Settings-Seite.
