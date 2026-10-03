# PRODUCT.md — JOOK (Gym Log)

> Produkt-Wahrheit für alle Design-Entscheidungen. Visuelle Welt: `src/index.css` (Tokens) ist die einzige Quelle. Dieses File beschreibt das WAS und FÜR WEN, nicht das Wie es aussieht.

## Was JOOK ist
Offline-fähiges Gym-Tagebuch als iPhone-PWA. Alle Trainingsdaten lokal (Dexie/IndexedDB), kein Account, kein Server für Nutzerdaten. Ziel: beim Training sofort die letzte Einstellung sehen, Sätze loggen, wissen ob Steigern dran ist.

## Der eine Nutzer
Jan, Einzelnutzer, iPhone 15 Pro, PWA vom Homescreen. Trainiert mit Vorlagen (UPPER 01–03, ~14 Übungen, 1–2 Arbeitssätze pro Übung, RIR-Tracking). Arbeitet im Bulk/Cut/Recomp-Zyklus, wiegt sich täglich. Deutsche UI, du-Ansprache, sachlich-motivierend ohne Kitsch.

## Kern-Jobs (in Priorität)
1. **Satz loggen in < 5 s** — Session-Overlay, Zahlentasten, Abhaken, Pausen-Timer.
2. **Letzte Einstellung finden** — Bibliothek/Detail/Verlauf, Warm-up-Rechner.
3. **Steigern erkennen** — Progression-Chip (Kraft/Größe/Ausdauer), Fortschritts-Ringe, Analyse der letzten 30 Tage.
4. **Plan reinholen** — Foto/Text-Import via OpenRouter (`OPENROUTER_API_KEY`), mappend auf Übungsbibliothek.

## Was niemals wegfällt
- Konzept, Features, Navigation (4 Tabs + Start-Button), Datenmodell, Trainingslogik.
- 4 Dark-Themes: `garmin` (Standard, Lime #c8ff00), `bordeaux`, `whoop`, `ember` — Tokens zentral in `src/index.css`, jede UI in allen 4 Themes funktionstüchtig.
- Das Neumorphismus-/Plush-Layering-Material (`--neo-*`-Schattensystem, weiche Schatten von oben, feine Outlines). V2 (03.10.2026) vertieft es Richtung Near-Black statt Mid-Grau.
- Lokale Datenhoheit: Dexie-Schema nur nicht-destruktiv migrieren.

## Qualitätslinie (V2, 03.10.2026)
Apple/Whoop/Bevel-Niveau: Near-Black-Flächen mit Hairlines statt sichtbarer Outlines, Akzent nur wo Zustand ist (nicht als Dauer-Deko), kein Neon-Glow auf Buttons, Zahlen tabular, Micro-Labels einheitlich, Motion = Springs (damping ~1) und nur mit Zweck. Kein AI-Slop: keine Icon-in-Box-Card-Scaffoldings, keine Standard-Blautöne, keine generischen Muster.

## Deployment
Push auf `main` → Vercel (`gym-log`). Build/Lint/Test müssen grün sein.
