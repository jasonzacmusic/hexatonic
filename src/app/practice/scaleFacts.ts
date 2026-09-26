/**
 * Facts the Practice page prints about the current drill. Every sentence here
 * is computed from src/lib/theory, never typed in, and each is locked by
 * tests/practice.test.ts.
 */

import type { Note } from "../../lib/theory/note";
import { pc } from "../../lib/theory/note";
import { RAGAS, buildRaga, type Raga } from "../../lib/theory/ragas";
import { solveResolution, type ResolveMode } from "../../lib/theory/resolution";
import { FAMILY_GROUPS, type Family, type FamilyGroup } from "../../lib/theory/scales";

/** Carnatic ragas that use exactly these notes, the same way up and down. */
export function ragasForScale(tonic: string, notes: Note[]): Raga[] {
  if (!notes.length) return [];
  const want = new Set(notes.map(pc));
  return RAGAS.filter((r) => r.tradition === "carnatic" && !r.vakra).filter((r) => {
    const inst = buildRaga(tonic, r.id);
    if (inst.error) return false;
    const up = new Set(inst.arohana.map(pc));
    const down = new Set(inst.avarohana.map(pc));
    const same = (a: Set<number>) => a.size === want.size && [...a].every((p) => want.has(p));
    return same(up) && same(down);
  });
}

/** With the top note on, how many bars the drill takes, against without it. */
export function topNoteCost(
  patternLength: number, sub: number, beats: number, grouping: number, mode: ResolveMode,
): { withTop: number; without: number; length: number } {
  return {
    length: patternLength,
    withTop: solveResolution(patternLength, sub, beats, grouping, mode).bars,
    without: solveResolution(patternLength - 1, sub, beats, grouping, mode).bars,
  };
}

/** If triplets would bring the same drill home in fewer bars, say so. */
export function tripletHint(
  patternLength: number, sub: number, beats: number, grouping: number, mode: ResolveMode,
): string | null {
  if (sub === 3) return null;
  const now = solveResolution(patternLength, sub, beats, grouping, mode).bars;
  const trip = solveResolution(patternLength, 3, beats, grouping, mode).bars;
  if (now <= 4 || trip >= now) return null;
  return `In triplets the same drill lands in ${trip} bar${trip === 1 ? "" : "s"}.`;
}

/* ── the family menu ──────────────────────────────────────────────────────
   Every scale the app knows, under the same group names the Sounds page uses,
   in this order: Remove one note, Pentatonic plus one, Symmetric, Colour
   scales, World scales, Custom. The "compare" and "reference" families (the
   five- and seven-note parents, the octatonics) stay out of the menu. */

export const MENU_GROUPS: FamilyGroup[] = [
  "remove", "pentatonic", "symmetric", "colour", "beyond", "custom",
];

/** The six-note groups "Surprise me" may roll from. */
const SURPRISE_GROUPS: FamilyGroup[] = ["remove", "pentatonic", "symmetric", "colour"];

/** The plain-English label of a family's group, from FAMILY_GROUPS. */
export const familyGroup = (f: Family): string =>
  FAMILY_GROUPS.find((g) => g.id === f.group)?.label ?? "Compare with";

/** Families grouped for an <optgroup> menu, in MENU_GROUPS order. */
export function groupFamilies(families: Family[]): { group: string; families: Family[] }[] {
  return MENU_GROUPS
    .map((id) => ({
      group: FAMILY_GROUPS.find((g) => g.id === id)?.label ?? id,
      families: families.filter((f) => f.group === id),
    }))
    .filter((g) => g.families.length > 0);
}

/** The six-note families "Surprise me" may roll: never custom, never the
 *  five- or seven-note world scales. */
export const isSixNoteSound = (f: Family) =>
  f.size === 6 && f.kind !== "custom" && SURPRISE_GROUPS.includes(f.group);

/** "b3" → "♭3", for display. */
export const prettyDegree = (d: string) => d.replace(/b/g, "♭").replace(/#/g, "♯");
