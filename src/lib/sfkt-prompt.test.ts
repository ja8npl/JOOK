import { describe, expect, it } from "vitest";
import { ANALYSIS_SYSTEM_PROMPT } from "../../lib/prompts/analysis-system-prompt";

/**
 * Guard-Tests für den Analyse-System-Prompt:
 * Die Regeln stammen aus knowledge/pushit/SFKT.pdf (aufbereitet in
 * lib/prompts/knowledge/sfkt-rules.md). Der Prompt darf keine Zahlen erfinden,
 * die nicht in der Quelle stehen, und darf die gekennzeichneten Lücken
 * (RIR/RPE-Schwellen, Deload-Regeln) nicht stillschweigend füllen.
 */
describe("ANALYSIS_SYSTEM_PROMPT — SFKT-Regeln", () => {
  it("enthält die drei Ziele und jede Trainingsalter-Stufe in allen drei Ziel-Sektionen", () => {
    for (const ziel of ["Maximalkraft", "Hypertrophie", "Kraftausdauer"]) {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain(ziel);
    }
    const stufen = ["0–3 M", "3–6 M", "6–12 M", "12–24 M", "24–60 M", "60+ M"];
    for (const stufe of stufen) {
      const anzahl = ANALYSIS_SYSTEM_PROMPT.split(stufe).length - 1;
      expect(anzahl).toBeGreaterThanOrEqual(3);
    }
  });

  it("enthält die belegten Kernzahlen unverändert", () => {
    for (const kern of [
      "2–10 %",
      "2–5 %",
      "zwei aufeinanderfolgenden Einheiten",
      "80 % 1RM",
      "10 Sätze pro Muskelgruppe pro Woche",
      "mindestens 2× pro Woche",
      "40–60 % 1RM",
      "unter 90 Sekunden",
      "48–72 h",
    ]) {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain(kern);
    }
  });

  it("markiert die RIR/RPE- und Deload-Lücken und erfindet keine Schwellen", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("KEINE RIR-/RPE-Schwellen");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Keine expliziten Deload-Regeln");
    expect(ANALYSIS_SYSTEM_PROMPT).not.toMatch(/RIR\s*(≥|>=)\s*\d/);
    expect(ANALYSIS_SYSTEM_PROMPT).not.toMatch(/RPE\s*(≥|>=)\s*\d/);
    expect(ANALYSIS_SYSTEM_PROMPT).not.toMatch(/Deload\s+(alle|jede)/i);
  });

  it("enthält die Leitprinzipien und Verhaltensregeln", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Konsistenz und ausreichender Trainingsreiz");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Doppelprogression");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Keine medizinischen Ratschläge");
  });

  it("hat eine Prompt-Länge im vertretbaren Rahmen", () => {
    expect(ANALYSIS_SYSTEM_PROMPT.length).toBeGreaterThan(2000);
    expect(ANALYSIS_SYSTEM_PROMPT.length).toBeLessThan(9000);
  });
});
