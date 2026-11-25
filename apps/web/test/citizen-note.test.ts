import { describe, expect, it } from "vitest";
import { readCitizenNote, reportRowSummary } from "@/lib/citizenNote";

// How the dashboard reads the Citizen note the app stores with a Report: the
// chips the citizen tapped, joined with ", " on the first line, then the text
// they typed.

describe("reading a Citizen note", () => {
  it.each([
    ["no note", null],
    ["a missing note", undefined],
    ["an empty note", ""],
    ["a note of only whitespace", "  \n\t "],
  ])("finds no note in %s", (_, stored) => {
    expect(readCitizenNote(stored)).toBeNull();
  });

  it("reads a note of only chips", () => {
    expect(readCitizenNote("Unconscious, Not breathing")).toEqual({
      chips: ["Unconscious", "Not breathing"],
      text: "",
    });
  });

  it("reads a note of only typed text", () => {
    expect(readCitizenNote("It's his left arm")).toEqual({
      chips: [],
      text: "It's his left arm",
    });
  });

  it("reads chips followed by typed text over several lines", () => {
    expect(
      readCitizenNote(
        "Heavy bleeding, Vehicle accident\nIt's his left arm.\nHe can't stand up."
      )
    ).toEqual({
      chips: ["Heavy bleeding", "Vehicle accident"],
      text: "It's his left arm.\nHe can't stand up.",
    });
  });

  it.each([
    ["an item that isn't a chip", "Unconscious, Dizzy\nStarted an hour ago"],
    ["a chip's name in different case", "fire\nIn the kitchen"],
    ["a trailing comma", "Fire,\nIn the kitchen"],
  ])(
    "reads the whole note as typed text when the first line has %s",
    (_, stored) => {
      expect(readCitizenNote(stored)).toEqual({ chips: [], text: stored });
    }
  );

  it("trims whitespace around the note and the typed text", () => {
    expect(
      readCitizenNote("  \n Fire , Unconscious \n\n  Third floor, room 12  \n")
    ).toEqual({
      chips: ["Fire", "Unconscious"],
      text: "Third floor, room 12",
    });
  });
});

// The one line a Queue or History row shows for a Report.
describe("summarising a Report for its row", () => {
  const PHOTO_DESCRIPTION =
    "A deep cut on one forearm; which arm can't be told from the photo.";

  it("shows the chips, then the typed text on one line", () => {
    expect(
      reportRowSummary({
        citizen_note:
          "Not breathing, Heavy bleeding\nFell off a ladder.\nIt's his left arm.",
        description: PHOTO_DESCRIPTION,
        reporter_name: "Maria Santos",
      })
    ).toBe(
      "Not breathing, Heavy bleeding; Fell off a ladder. It's his left arm."
    );
  });

  it("shows only the chips when nothing was typed", () => {
    expect(
      reportRowSummary({
        citizen_note: "Fire",
        description: PHOTO_DESCRIPTION,
        reporter_name: "Maria Santos",
      })
    ).toBe("Fire");
  });

  it("shows the typed text on one line when no chips were tapped", () => {
    expect(
      reportRowSummary({
        citizen_note: "Smoke from the second floor.\n\nPeople still inside.",
        description: PHOTO_DESCRIPTION,
        reporter_name: "Maria Santos",
      })
    ).toBe("Smoke from the second floor. People still inside.");
  });

  it("falls back to the photo description when there's no note", () => {
    expect(
      reportRowSummary({
        citizen_note: null,
        description: PHOTO_DESCRIPTION,
        reporter_name: "Maria Santos",
      })
    ).toBe(PHOTO_DESCRIPTION);
  });

  it("falls back to who filed it when there's no note or photo description", () => {
    expect(
      reportRowSummary({
        citizen_note: null,
        description: null,
        reporter_name: "Maria Santos",
      })
    ).toBe("From Maria Santos");
  });

  it("says it's a photo report when there's no note, photo description or name", () => {
    expect(
      reportRowSummary({
        citizen_note: " ",
        description: "",
        reporter_name: null,
      })
    ).toBe("Photo report");
  });
});
