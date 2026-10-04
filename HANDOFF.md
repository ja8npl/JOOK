# HANDOFF.md — JOOK (Gym Log)

> Nach jeder Aufgabe aktualisieren: Stand, offene Probleme, nächste Schritte.
> Projekt-Anweisungen: `AGENTS.md` (dieses Repo).

## Stand (04.10.2026)

- **V2 „Night Graphite"** live: Near-Black-Ramps pro Theme, Hairlines, Neumorphismus mit verstärkten Lichtkanten, opake Tab-Bar, Spring-Transitions ohne Exit-Wartezeit, gleitende Nav-Pill, pro-Theme Status-Bar + Splash-PNGs. Motion Identity: Energetic (Check-Pop + Stroke-Draw, Save-Beat mit Ripple), Premium (Sheets/Nav).
- **Rep-Ziel-Feature** live: globaler Zielbereich (Settings, Standard 6–8) + Override pro Übung (Dexie v7 `repTargets`), Target-Button + Slider-Sheet in der Session, Anzeige am REPS-Header/Placeholder, Steigerungs-Chip nutzt die Range.
- **Satzpausen-Feature** live: Pausen-Leiste dockt beim Abhaken eines Arbeitssatzes über den Footer (Wall-Clock-Deadline — iOS-Hintergrund/Sperrbildschirm-fest), ±15 s, Skip, Finish-Beat mit Ton/Vibration, Auto-Weg nach 4 s. Pausenzeit global (Base-Chips, wirkt sofort) + Override pro Übung (Dexie v8 `restTargets`).
- **Layout-Fixes**: Übungskarte in der Session ohne horizontalen Überlauf (34px-Action-Buttons), Warm-up-Zeilen mit fester Input-Breite.
- Alles deployed (Commits bis `1a12f0f`), 151/151 Tests, Build + Lint grün.
- Skill-Setup (04.10.): aktive Skills in `C:\JOOK\.agents\skills`, alle übrigen im Pool `C:\JOOK\_skills-pool` (nichts gelöscht). AGENTS.md im Workspace-Root ist nur noch ein Verweis.
- **UI-Selbstverifikation eingerichtet** (04.10.): `python _local/ui_verify.py --screens <...>` (Python-Playwright, headless Chromium) liefert geänderte Screens in 393×852 @3× in allen 4 Themes + Layout-/Crash-Checks — der zuverlässige Weg (das eingebaute Preview-Tool war bei Screenshots flaky). Regel steht in AGENTS.md.
- **Weiche Kanten = progressiver Blur** (04.10., überarbeitet nach Nutzer-Feedback): Trainings-Sheet löst Content an Ober-/Unterkante über **6 gestapelte 8px-Backdrop-Blur-Streifen mit steigender Stärke (30→2px)** auf — Depth-of-Field ohne Farb-/Alpha-Mixing (alle früheren Varianten — Mask-Fade, getönte Skirts, feTurbulence-Korn — erzeugten ein sichtbares Schmutz-Band über den soliden Karten). Schalter in Base → „Darstellung & Backup" → „Weiche Kanten" (Default an, Live-Update per `jook:prefs`-Event; Storage-Key `gymlog.softEdges`). Deploy `d1cc38b`.

## Offene Probleme

- **Uncommitted WIP von Jan**: `src/components/RestTimer.tsx` (EntryForm-Timer; nutzt jetzt `lib/timerFeedback`) und `vite.config.ts` — vor Commit testen, was davon produktiv soll.
- **Fehlende Skills** (genannt, aber in keiner Quelle installiert): Behavioral, Research, Stop slop, UX design, Web accessibility, UI skills route, CSS animations, Taste v2 als eigener Skill (design-taste-frontend springt interimistisch ein). Quellen klären, dann `npx skills add <owner/repo@skill>` in `C:\JOOK` ausführen.
- **`waapi`** ist in der Registry gelistet, aber das Pack `heygen-com/hyperframes` liefert ihn nicht mehr aus (Umbenennung) — Alternative finden oder streichen.
- **Dexie-Upgrade-Erlebnis**: nach jedem neuen Store (v7/v8) crasht der erste App-Boot mit „Etwas ist schiefgelaufen" → einmal „App neu laden" heilt (offene Connections blockieren das Upgrade). ErrorBoundary zeigt jetzt die Fehlermeldung. Prüfen, ob das am iPhone beim Update auf Nutzer störend auffällt.
- `gym-log\skills-lock.json` referenziert die ins Pool verschobenen Packs (veraltet — vor `experimental_install` bereinigen oder ignorieren).

## Nächste Schritte

1. iPhone-Verifikation der letzten Features: Rep-Ziel-Regler, Pause-Leiste inkl. Sperrbildschirm-Test, Dexie-v8-Upgrade-Reload, Backup-Roundtrip mit `repTargets`/`restTargets`.
2. RestTimer-WIP (`RestTimer.tsx`, `vite.config.ts`) sichten und committen oder verwerfen.
3. Fehlende Skills installieren (Quellen oben sammeln) — danach AGENTS.md-Routing prüfen.
4. Backlog-„Backup merge vs. replace" bewerten: Import läuft mit `clear()` + Sicherheitskopie — bewusst lassen oder auf Merge umstellen.
