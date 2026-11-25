import type { Incident } from "@/types/incident";

/**
 * The chips a citizen can tap when filing a Report. They mirror DETAIL_CHIPS
 * in apps/mobile/src/screens/report/ReportScreen3.tsx; if the app adds a chip,
 * add it here too, or the dashboard shows that note as typed text.
 */
const CITIZEN_NOTE_CHIPS: readonly string[] = [
  "Unconscious",
  "Heavy bleeding",
  "Not breathing",
  "Vehicle accident",
  "Fire",
];

/** A Citizen note read into the chips the citizen tapped and the text they typed. */
export interface CitizenNote {
  chips: string[];
  /** The typed text, with its line breaks; empty when only chips were tapped. */
  text: string;
}

/**
 * Reads the Citizen note stored with a Report, or null when there's none.
 * The app stores the chips joined with ", " on the first line, then the typed
 * text. The first line counts as chips only when every item on it is a known
 * chip; otherwise the whole note is typed text.
 */
export function readCitizenNote(
  stored: string | null | undefined
): CitizenNote | null {
  const note = stored?.trim();
  if (!note) return null;

  const lineBreak = note.indexOf("\n");
  const firstLine = lineBreak === -1 ? note : note.slice(0, lineBreak);
  const items = firstLine.split(",").map((item) => item.trim());
  if (!items.every((item) => CITIZEN_NOTE_CHIPS.includes(item))) {
    return { chips: [], text: note };
  }
  return {
    chips: items,
    text: lineBreak === -1 ? "" : note.slice(lineBreak + 1).trim(),
  };
}

/**
 * The one line a Queue or History row shows for a Report: the Citizen note
 * ("Not breathing, Heavy bleeding; Fell off a ladder"), else the photo
 * description, else who filed it.
 */
export function reportRowSummary(
  report: Pick<Incident, "citizen_note" | "description" | "reporter_name">
): string {
  const note = readCitizenNote(report.citizen_note);
  if (note) {
    const text = note.text.replace(/\s*\n\s*/g, " ");
    return [note.chips.join(", "), text].filter(Boolean).join("; ");
  }
  return (
    report.description ||
    (report.reporter_name ? `From ${report.reporter_name}` : "Photo report")
  );
}
