/**
 * The one scale menu every page uses: which families, in which order, under
 * which headings, and which modes each one has. The picker component
 * (src/components/ScaleModePicker.tsx) only draws what this file says, so no
 * page can drift out of step with the library again.
 *
 * A page may leave a scale out only where it makes no musical sense there,
 * and then the scale is still listed, greyed out, with a one-line reason.
 * tests/scale-coverage.test.ts enumerates every family and every mode and
 * checks every page's menu against the exceptions written down here and in
 * docs/scale-coverage.md.
 *
 * Imports are relative (not "@/") so the tests can load this file.
 */

import { FAMILIES, Family, FamilyGroup, familyById, menuGroupLabel, modeCount } from "./theory/scales";

/** The order of the headings, in every menu: the six-note scales first. */
export const PICKER_GROUPS: FamilyGroup[] = [
  "remove", "pentatonic", "symmetric", "colour", "seven", "compare", "reference", "beyond", "custom",
];

/**
 * The order a family's modes are offered in, on the mode strip.
 *
 * The diatonic hexachord is one shape with six moods. Starting on each note of
 * the Sunday Scale in turn (G A B C D E, then from A, from B …) gives them in
 * this order: Sunday (no 7), Minor (no 6), Phrygian (no 5), Major (no 4),
 * Suspended (no 3), Dark minor (no 2). Every other family keeps the order of
 * its own notes: mode 1 from its 1st note, mode 2 from its 2nd, and so on.
 */
export function modeOrder(f: Family): number[] {
  const n = modeCount(f);
  if (f.id === "diatonic") return [3, 4, 5, 0, 1, 2];
  return Array.from({ length: n }, (_, i) => i);
}

/** The next or previous mode in strip order, wrapping round. */
export function stepMode(f: Family, mode: number, dir: 1 | -1): number {
  const order = modeOrder(f);
  const at = Math.max(0, order.indexOf(mode));
  return order[(at + dir + order.length) % order.length];
}

/** A menu value: "diatonic:3" is the diatonic family, mode 3. */
export const codeOf = (family: string, mode = 0) => `${family}:${mode}`;
export function parseCode(code: string): { family: string; mode: number } {
  const i = code.lastIndexOf(":");
  if (i < 0) return { family: code, mode: 0 };
  return { family: code.slice(0, i), mode: Number(code.slice(i + 1)) || 0 };
}

/** One family in a menu. `reason` is set when this page cannot use it. */
export interface MenuFamily {
  family: Family;
  label: string;
  reason: string | null;
}

export interface MenuGroup {
  id: FamilyGroup;
  label: string;
  families: MenuFamily[];
}

/** Why a page cannot use a family, or null if it can. */
export type Exclude = (f: Family) => string | null;

/** A family's name in the menu: its short name, plus how many modes it has. */
export function familyMenuLabel(f: Family): string {
  const n = modeCount(f);
  return n > 1 ? `${f.short} · ${n} modes` : f.short;
}

/** The whole menu, grouped, with every family in the library. */
export function menuGroups(exclude: Exclude = () => null): MenuGroup[] {
  return PICKER_GROUPS.map((id) => ({
    id,
    label: menuGroupLabel(id),
    families: FAMILIES.filter((f) => f.group === id)
      .map((family) => ({ family, label: familyMenuLabel(family), reason: exclude(family) })),
  })).filter((g) => g.families.length > 0);
}

/* ── each page's exceptions ───────────────────────────────────────────────
   Written down once, here, in plain words. Everything not named is offered. */

const CUSTOM_ELSEWHERE = "Build your own on Practice: this page needs a named scale.";

export type PageId = "practice" | "sounds" | "improvise" | "ear" | "chords" | "pairs";

export const PAGE_EXCLUDE: Record<PageId, Exclude> = {
  /* Practice drills any set of notes, five to eight, and builds custom ones. */
  practice: () => null,
  sounds: (f) => (f.kind === "custom" ? CUSTOM_ELSEWHERE : null),
  improvise: (f) => (f.kind === "custom" ? CUSTOM_ELSEWHERE : null),
  ear: (f) => (f.kind === "custom" ? CUSTOM_ELSEWHERE : null),
  chords: (f) => (f.kind === "custom" ? CUSTOM_ELSEWHERE : null),
  /* Two triads that share no note make exactly six notes. */
  pairs: (f) => {
    if (f.kind === "custom") return CUSTOM_ELSEWHERE;
    if (f.size === 5) return "Five notes: two triads always make six.";
    if (f.size === 7) return "Seven notes: choose “7-note parent” above for its pairs.";
    if (f.size === 8) return "Eight notes: two four-note chords make it. See the Sixth–diminished tab.";
    return null;
  },
};

/** Every family and mode on a page's menu, flat, for the tests and the docs. */
export function pageEntries(page: PageId): { family: string; mode: number; reason: string | null }[] {
  return menuGroups(PAGE_EXCLUDE[page]).flatMap((g) => g.families.flatMap((m) =>
    Array.from({ length: modeCount(m.family) }, (_, mode) => ({ family: m.family.id, mode, reason: m.reason }))));
}

/** The name of one scale: the mode's name, or the family's short name. */
export function scaleName(family: string, mode = 0): string {
  const f = familyById(family);
  return f.modes?.[mode]?.name ?? f.short;
}
