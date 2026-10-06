# HANDOFF.md — JOOK (Gym Log)

> Nach jeder Aufgabe aktualisieren: Stand, offene Probleme, nächste Schritte.
> Projekt-Anweisungen: `AGENTS.md` (dieses Repo).

## Stand (06.10.2026)

- **V2 „Night Graphite"** live: Near-Black-Ramps pro Theme, Hairlines, Neumorphismus mit verstärkten Lichtkanten, opake Tab-Bar, Spring-Transitions ohne Exit-Wartezeit, gleitende Nav-Pill, pro-Theme Status-Bar + Splash-PNGs. Motion Identity: Energetic (Check-Pop + Stroke-Draw, Save-Beat mit Ripple), Premium (Sheets/Nav).
- **Rep-Ziel-Feature** live: globaler Zielbereich (Settings, Standard 6–8) + Override pro Übung (Dexie v7 `repTargets`), Target-Button + Slider-Sheet in der Session, Anzeige am REPS-Header/Placeholder, Steigerungs-Chip nutzt die Range.
- **Satzpausen-Feature** live: Pausen-Leiste dockt beim Abhaken eines Arbeitssatzes über den Footer (Wall-Clock-Deadline — iOS-Hintergrund/Sperrbildschirm-fest), ±15 s, Skip, Finish-Beat mit Ton/Vibration, Auto-Weg nach 4 s. Pausenzeit global (Base-Chips, wirkt sofort) + Override pro Übung (Dexie v8 `restTargets`).
- **Built-in-Pläne angepasst** (06.10., alle 3 UPPER-Pläne über die geteilten Übungsgruppen): Schrägbankdrücken Smith 1 → 2 Sätze; „Shoulder Shrug Low Row" (Cable_Shrugs) ersetzt durch **High Row Maschine** (`Leverage_High_Row`, machine, middle back, 2 × 8). Historie/Dexie unberührt — Templates werden nur beim Session-Start gelesen; laufende/gespeicherte Sessions behalten ihre Snapshots.
- **Session-„…"-Menü** (06.10.): X oben rechts durch „…"-Popover ersetzt (opake Elevated-Fläche im RIR-Stil, kein Glass-Blur): Training pausieren/fortsetzen (friert die Uhr ein — `pausedAt` in der Session, Resume verschiebt `startedAt`; pausierter Live-Dot), Übungen neu sortieren, Trainingseinstellungen, Training verwerfen (rot, Trash-Icon → bestehendes Hold-to-Confirm). Escape/Außen-Tap schließen das Popover; solange offen ist der Session-Escape (Verwerfen) ausgehängt.
- **Übungen neu sortieren** (06.10.): Bottom-Sheet (`ReorderExercisesSheet.tsx`) mit framer-motion `Reorder` — Drag nur am 2×3-Griff (`dragListener={false}` + `touch-action:none`, Rest der Karte scrollt normal), Haptik-Puls pro Swap (`lib/haptics.ts`, iOS-Safari no-op), Auto-Scroll am Listenrand (14 Übungen!), zentrierter Titel, großer „Speichern"-Button. Speichern sortiert die Session-Objekte per ID um — Sätze/Werte bleiben erhalten. `BottomSheet` hat dafür das optionale `centeredTitle`.
- **Trainingseinstellungen** (06.10.): Bottom-Sheet (`SessionSettingsSheet.tsx`) mit denselben Standardwerten wie Base → „Pausen-Timer & Sätze" (Pausenzeit-Chips, RIR-Vorauswahl, Timer-Sound/Vibration), `useBasePrefs` schreibt sofort.
- **Layout-Fixes**: Übungskarte in der Session ohne horizontalen Überlauf (34px-Action-Buttons), Warm-up-Zeilen mit fester Input-Breite.
- 155/155 Tests (neu: `sessionElapsedSeconds`), Build + Lint grün (0 Warnungen).
- Skill-Setup (04.10.): aktive Skills in `C:\JOOK\.agents\skills`, alle übrigen im Pool `C:\JOOK\_skills-pool` (nichts gelöscht). AGENTS.md im Workspace-Root ist nur noch ein Verweis.
- **UI-Selbstverifikation eingerichtet** (04.10.): `python _local/ui_verify.py --screens <...>` (Python-Playwright, headless Chromium) liefert geänderte Screens in 393×852 @3× in allen 4 Themes + Layout-/Crash-Checks — der zuverlässige Weg (das eingebaute Preview-Tool war bei Screenshots flaky). Regel steht in AGENTS.md. Zusätzlich (06.10.): `_local/verify_session_features.py` — klickt das Menü/die Sheets durch, dragt eine Übung, prüft Speichern/Pause per localStorage (25 Checks).
- **Weiche Kanten = progressiver Blur** (04.10., überarbeitet nach Nutzer-Feedback): Trainings-Sheet löst Content an Ober-/Unterkante über **6 gestapelte 8px-Backdrop-Blur-Streifen mit steigender Stärke (30→2px)** auf — Depth-of-Field ohne Farb-/Alpha-Mixing (alle früheren Varianten — Mask-Fade, getönte Skirts, feTurbulence-Korn — erzeugten ein sichtbares Schmutz-Band über den soliden Karten). Schalter in Base → „Darstellung & Backup" → „Weiche Kanten" (Default an, Live-Update per `jook:prefs`-Event; Storage-Key `gymlog.softEdges`). Deploy `d1cc38b`.

## Offene Probleme

- **Uncommitted WIP von Jan**: `src/components/RestTimer.tsx` (EntryForm-Timer; nutzt jetzt `lib/timerFeedback`) und `vite.config.ts` — vor Commit testen, was davon produktiv soll. (Hinzu kommen die uncommitteten Änderungen dieser Aufgabe — siehe Stand 06.10.)
- **Fehlende Skills** (genannt, aber in keiner Quelle installiert): Behavioral, Research, Stop slop, UX design, Web accessibility, UI skills route, CSS animations, Taste v2 als eigener Skill (design-taste-frontend springt interimistisch ein). Quellen klären, dann `npx skills add <owner/repo@skill>` in `C:\JOOK` ausführen.
- **`waapi`** ist in der Registry gelistet, aber das Pack `heygen-com/hyperframes` liefert ihn nicht mehr aus (Umbenennung) — Alternative finden oder streichen.
- **Dexie-Upgrade-Erlebnis**: nach jedem neuen Store (v7/v8) crasht der erste App-Boot mit „Etwas ist schiefgelaufen" → einmal „App neu laden" heilt (offene Connections blockieren das Upgrade). ErrorBoundary zeigt jetzt die Fehlermeldung. Prüfen, ob das am iPhone beim Update auf Nutzer störend auffällt.
- `gym-log\skills-lock.json` referenziert die ins Pool verschobenen Packs (veraltet — vor `experimental_install` bereinigen oder ignorieren).
- **Reorder-Sheet ohne Auto-Scroll-Schönheit**: Auto-Scroll am Rand funktioniert, aber framer-motion Reorder scrollt nicht *während* stillstehendem Finger außerhalb der Ränder-Kante — am echten iPhone prüfen, ob das bei 14 Übungen reicht.

## Nächste Schritte

1. iPhone-Verifikation: „…"-Menü (Pause-Uhr friert wirklich, Fortsetzen rechnet Pause heraus), Sortier-Sheet am Touch (Drag am Griff, kein Scroll-Konflikt, Auto-Scroll, Haptik — iOS vibriert dort nicht, erwartet), Trainingseinstellungen wirken in laufender Session, neue Pläne (High Row/2 Sätze Schrägbank) erscheinen beim Start aus UPPER 01–03.
2. Commits für die 06.10.-Änderungen erstellen (builtinTemplates, Session-Menü, Reorder-Sheet, Settings-Sheet, Tests, Screens-Verify-Skript).
3. iPhone-Verifikation der älteren Features: Rep-Ziel-Regler, Pause-Leiste inkl. Sperrbildschirm-Test, Dexie-v8-Upgrade-Reload, Backup-Roundtrip mit `repTargets`/`restTargets`.
4. RestTimer-WIP (`RestTimer.tsx`, `vite.config.ts`) sichten und committen oder verwerfen.
5. Fehlende Skills installieren (Quellen oben sammeln) — danach AGENTS.md-Routing prüfen.
6. Backlog-„Backup merge vs. replace" bewerten: Import läuft mit `clear()` + Sicherheitskopie — bewusst lassen oder auf Merge umstellen.
