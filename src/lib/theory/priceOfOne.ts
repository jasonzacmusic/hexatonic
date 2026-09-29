/**
 * FOR THE PRICE OF ONE: a symmetrical scale started on another of its own
 * notes gives back the same notes. G, B and E♭ augmented are one set of six
 * notes, so learning one of them is learning three.
 *
 * Nothing here is a typed-in list. Each family's sets are found by building
 * the scale in all twelve keys and grouping the keys whose notes are the same
 * (tests/price-of-one.test.ts checks the grouping against a brute-force
 * transposition search):
 *
 *   whole tone                        2 sets of 6 keys   learn 1, get 6
 *   augmented                         4 sets of 3        learn 1, get 3
 *   Petrushka, Messiaen mode 5,
 *   no common name                    6 sets of 2        learn 1, get 2
 *   octatonic (half–whole, whole–half) 3 sets of 4       learn 1, get 4
 *
 * The chords a set holds are the same from every one of its starting notes,
 * spelled by the same namer as the Practice chord strip and the Chords tab
 * (ownSpellingFirst): in G augmented G+ = G B D♯ and B♭+ = B♭ D F♯.
 */

import { KEYS, buildScale, familyById, ScaleInstance } from "./scales";
import { LETTERS, Letter, Note, noteName, notePretty, parseNoteName, pc, spell, stepLetter } from "./note";
import { repeatsEvery } from "./symmetric";
import { findChords, tertianOnly, ChordSet } from "./chords";
import { ownSpellingFirst } from "../../app/harmony/scaleOptions";

const mod12 = (x: number) => ((x % 12) + 12) % 12;

/** The symmetrical families, six-note first, then the two octatonics. */
export const PRICE_FAMILIES = ["whole", "aug", "petrushka", "messiaen5", "tritone-minor", "dim-hw", "dim-wh"] as const;
export type PriceFamilyId = (typeof PRICE_FAMILIES)[number];
export const isPriceFamily = (id: string): id is PriceFamilyId =>
  (PRICE_FAMILIES as readonly string[]).includes(id);

/** Short names for the family switch. */
export const PRICE_SHORT: Record<PriceFamilyId, string> = {
  whole: "Whole tone",
  aug: "Augmented",
  petrushka: "Petrushka",
  messiaen5: "Messiaen mode 5",
  "tritone-minor": "No common name",
  "dim-hw": "Octatonic half–whole",
  "dim-wh": "Octatonic whole–half",
};

/** How the scale is named in a sentence: "G augmented", "G whole tone". */
export const PRICE_NOUN: Record<PriceFamilyId, string> = {
  whole: "whole tone",
  aug: "augmented",
  petrushka: "Petrushka",
  messiaen5: "Messiaen mode 5",
  "tritone-minor": "no-common-name scales",
  "dim-hw": "half–whole octatonic",
  "dim-wh": "whole–half octatonic",
};

/** Plural for "all 12 … scales". */
export const PRICE_PLURAL: Record<PriceFamilyId, string> = {
  whole: "whole-tone scales",
  aug: "augmented scales",
  petrushka: "Petrushka scales",
  messiaen5: "Messiaen mode 5 scales",
  "tritone-minor": "no-common-name scales",
  "dim-hw": "half–whole octatonics",
  "dim-wh": "whole–half octatonics",
};

/** The app's key for each pitch class: 1 is D♭, 6 is F♯ (KEYS holds one per pitch). */
const KEY_OF_PC: string[] = (() => {
  const out: string[] = [];
  for (const k of KEYS) out[pc(parseNoteName(k))] = k;
  return out;
})();
export const keyPc = (k: string) => pc(parseNoteName(k));
export const keyOfPc = (p: number) => KEY_OF_PC[mod12(p)];
export const prettyKeyName = (k: string) => k.replace(/#/g, "♯").replace(/b/g, "♭");

const setKey = (s: ScaleInstance) => [...new Set(s.pcs.map(mod12))].sort((a, b) => a - b).join(",");

export interface PriceSet {
  /** 0 = the set the chosen key is in, then up by half steps */
  index: number;
  /** the key in this set nearest above the chosen key: the one to learn */
  lead: string;
  /** every key whose scale has these notes, going up from the lead */
  keys: string[];
  /** the notes, as pitch classes 0–11, low to high */
  pcs: number[];
  /** the scale as it is spelled from the lead */
  scale: ScaleInstance;
  /** each key as the lead scale spells it (C♯ in G whole tone), same order as keys */
  names: string[];
}

export interface PriceFamily {
  familyId: PriceFamilyId;
  /** notes in the scale: 6, or 8 for the octatonics */
  size: number;
  /** half steps you move it to get the same notes back */
  period: number;
  /** scales per set: "learn 1, get N" */
  perSet: number;
  sets: PriceSet[];
}

/**
 * Group the twelve keys by the notes their scale holds. `from` picks which
 * key leads: the sets are listed going up by half steps from it, so from G
 * the augmented sets are led by G, A♭, A and B♭.
 */
export function priceFamily(familyId: PriceFamilyId, from = "G"): PriceFamily {
  const fromPc = keyPc(from);
  const groups = new Map<string, string[]>();
  for (const k of KEYS) {
    const id = setKey(buildScale(k, familyId, 0));
    groups.set(id, [...(groups.get(id) ?? []), k]);
  }
  const up = (k: string) => mod12(keyPc(k) - fromPc);
  const sets = [...groups.entries()].map(([id, keys]) => {
    const lead = [...keys].sort((a, b) => up(a) - up(b))[0];
    const ordered = [...keys].sort((a, b) => mod12(keyPc(a) - keyPc(lead)) - mod12(keyPc(b) - keyPc(lead)));
    const scale = buildScale(lead, familyId, 0);
    return { lead, keys: ordered, pcs: id.split(",").map(Number), scale, names: ordered.map((k) => startName(scale.notes, k, familyId)) };
  }).sort((a, b) => up(a.lead) - up(b.lead)).map((s, index) => ({ ...s, index }));
  const size = buildScale(from, familyId, 0).notes.length;
  const period = repeatsEvery(sets[0].pcs);
  return { familyId, size, period, perSet: sets[0].keys.length, sets };
}

/** The set a key is in. */
export function setOfKey(fam: PriceFamily, key: string): PriceSet {
  return fam.sets.find((s) => s.keys.includes(key)) ?? fam.sets[0];
}

/** "Learn these and you know all twelve": one lead per set. */
export const learnRoute = (fam: PriceFamily) => fam.sets.map((s) => s.lead);

/** "G, B and E♭" */
export function sayList(xs: string[]): string {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const NUMBER = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const sayNumber = (n: number) => NUMBER[n] ?? String(n);

/** "G, B and E♭ augmented are the same six notes." */
export function sameNotesLine(fam: PriceFamily, set: PriceSet): string {
  return `${sayList(set.names.map(prettyKeyName))} ${PRICE_NOUN[fam.familyId]} are the same ${sayNumber(fam.size)} notes.`;
}

/** "Learn these 4 and you know all 12 augmented scales." */
export function routeLine(fam: PriceFamily): string {
  return `Learn these ${fam.sets.length} and you know all 12 ${PRICE_PLURAL[fam.familyId]}.`;
}

/** Why it works, in one line: "Move it up a major third and you land on the same notes." */
const DISTANCE: Record<number, string> = {
  2: "a whole step", 3: "a minor third", 4: "a major third", 6: "a tritone",
};
export function whyLine(fam: PriceFamily): string {
  return `Move it up ${DISTANCE[fam.period] ?? `${fam.period} half steps`} and you land on the same notes.`;
}

/* ── the chords the set shares ─────────────────────────────────────────── */

export type TriadKind = "aug" | "maj" | "min" | "dim";
export interface SharedChord {
  kind: TriadKind;
  /** "G+", "E♭m", "B°" */
  symbol: string;
  /** "G B D♯" */
  notes: string;
  pcs: number[];
  voicing: Note[];
}

const kindOf = (sym: string): TriadKind | null =>
  sym.endsWith("aug") ? "aug" : sym.endsWith("dim") ? "dim" : /m$/.test(sym) ? "min" : /^[A-G](#|b|##|bb)?$/.test(sym) ? "maj" : null;

const prettyName = (x: string) => x.replace(/##/g, "𝄪").replace(/#/g, "♯").replace(/(?<=[A-G])bb/g, "𝄫").replace(/(?<=[A-G])b/g, "♭");

/**
 * The three-note chords inside a scale, named as the Practice chord strip
 * names them (ownSpellingFirst over findChords), augmented first, then major,
 * minor and diminished, each list going up from the tonic.
 */
export function sharedTriads(notes: Note[]): SharedChord[] {
  if (!notes.length) return [];
  const found: ChordSet[] = ownSpellingFirst(tertianOnly(findChords(notes, [3])), notes).chords;
  const tonic = pc(notes[0]);
  const ORDER: TriadKind[] = ["aug", "maj", "min", "dim"];
  return found.flatMap((c) => {
    const n = c.names[0];
    const kind = kindOf(n.symbol);
    if (!kind) return [];
    const suffix = kind === "aug" ? "+" : kind === "dim" ? "°" : kind === "min" ? "m" : "";
    /* Augmented chords keep the house names (G+ = G B D♯). Any other chord
       is written in stacked thirds: G° = G B♭ D♭, never G B♭ C♯. */
    const stacked = kind === "aug" ? null : stackedTriad(pc(n.voicing[0]), kind, notes);
    if (stacked) {
      const r = noteName(stacked[0]);
      return [{ kind, symbol: prettyName(r) + suffix, notes: stacked.map((x) => prettyName(noteName(x))).join(" "), pcs: c.pcs, voicing: n.voicing }];
    }
    const root = n.symbol.replace(/(aug|dim|m)$/, "");
    return [{ kind, symbol: prettyName(root) + suffix, notes: n.notes.map(prettyName).join(" "), pcs: c.pcs, voicing: n.voicing }];
  }).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) ||
    mod12(pc(a.voicing[0]) - tonic) - mod12(pc(b.voicing[0]) - tonic));
}

const TRIAD_SHAPE: Record<Exclude<TriadKind, "aug">, number[]> = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6] };
/** C♭, F♭, E♯, B♯ */
const oddWhite = (n: Note) =>
  (n.alt === -1 && (n.letter === "C" || n.letter === "F")) || (n.alt === 1 && (n.letter === "E" || n.letter === "B"));

/**
 * A triad on root, third and fifth letters (stacked thirds), with no double
 * sharp or flat. The root is spelled as the scale spells it where that
 * works; a C♭, F♭, E♯ or B♯ costs a little, a root the scale spells
 * differently costs more. So in G half–whole: G° = G B♭ D♭, B♭° = B♭ D♭ F♭,
 * and A♭° (A♭ C♭ E𝄫) becomes G♯° = G♯ B D.
 */
export function stackedTriad(rootPc: number, kind: Exclude<TriadKind, "aug">, scale: Note[]): Note[] | null {
  const own = scale.find((x) => pc(x) === rootPc);
  let best: { ns: Note[]; cost: number } | null = null;
  for (const L of LETTERS as unknown as Letter[]) {
    const r = spell(L, rootPc);
    if (!r || Math.abs(r.alt) > 1) continue;
    const t = spell(stepLetter(L, 2), mod12(rootPc + TRIAD_SHAPE[kind][1]));
    const f = spell(stepLetter(L, 4), mod12(rootPc + TRIAD_SHAPE[kind][2]));
    if (!t || !f) continue;
    const ns = [r, t, f];
    if (ns.some((x) => Math.abs(x.alt) > 1)) continue;
    const cost = ns.filter(oddWhite).length + (own && (own.letter !== r.letter || own.alt !== r.alt) ? 2 : 0);
    if (!best || cost < best.cost) best = { ns, cost };
  }
  return best?.ns ?? null;
}

/** Roots of the major (or minor) chords, as the scale spells them. */
export function rootsOf(chords: SharedChord[], kind: TriadKind): number[] {
  return chords.filter((c) => c.kind === kind).map((c) => pc(c.voicing[0]));
}

/**
 * One plain line about the chords, computed:
 *   augmented: "Two augmented chords, and a major and a minor chord on each
 *               of the three starting notes: G, B and E♭."
 */
export function chordsLine(fam: PriceFamily, set: PriceSet, chords: SharedChord[]): string {
  const count = (k: TriadKind) => chords.filter((c) => c.kind === k).length;
  const [a, M, m, d] = (["aug", "maj", "min", "dim"] as TriadKind[]).map(count);
  const startPcs = set.keys.map(keyPc).sort((x, y) => x - y).join(",");
  const onStarts = (k: TriadKind) => [...rootsOf(chords, k)].sort((x, y) => x - y).join(",") === startPcs;
  /* the starting notes as this scale spells them (C♯ in G half–whole, not D♭) */
  const starts = sayList(chords.filter((c) => c.kind === (M ? "maj" : "min")).map((c) => c.symbol.replace(/m$/, "")));
  const parts: string[] = [];
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const n = (k: number, word: string) => `${sayNumber(k)} ${word}${k === 1 ? "" : "s"}`;
  if (a) parts.push(n(a, "augmented chord"));
  if (M && m && M === m && onStarts("maj") && onStarts("min"))
    parts.push(`a major and a minor chord on each starting note (${starts})`);
  else if (M && onStarts("maj")) parts.push(`${n(M, "major chord")} on the starting notes (${starts})`);
  else if (m && onStarts("min")) parts.push(`${n(m, "minor chord")} on the starting notes (${starts})`);
  else {
    if (M) parts.push(n(M, "major chord"));
    if (m) parts.push(n(m, "minor chord"));
  }
  if (d) parts.push(n(d, "diminished chord"));
  if (!parts.length) return "No major, minor, augmented or diminished chord fits inside it.";
  return `${cap(sayList(parts))}. The same chords from every starting note.`;
}

/** The scale from each starting note of a set, spelled from that note. */
/** Too awkward for a tonic: E♯, B♯, F♭, C♭ or any double sharp or flat. */
const awkwardTonic = (n: Note) =>
  Math.abs(n.alt) > 1 || (n.alt === -1 && (n.letter === "C" || n.letter === "F")) ||
  (n.alt === 1 && (n.letter === "E" || n.letter === "B"));

/**
 * A starting note's name, spelled as the scale it sits on spells it: C♯ in
 * G whole tone (G A B C♯ D♯ F), not D♭. Where that would be an awkward tonic
 * (E♯, B♯, F♭, C♭, a double), the key's own name is used and the scale is
 * spelled from there instead.
 */
export function startName(scale: Note[], key: string, familyId?: string): string {
  const n = scale.find((x) => pc(x) === keyPc(key));
  if (!n || awkwardTonic(n)) return key;
  const name = noteName(n);
  /* the scale must really be spelled from that name (G♯ augmented would need
     double sharps, so the app writes it from A♭: use A♭ then) */
  if (familyId && name !== key) {
    const s = buildScale(name, familyId, 0);
    if (s.error || !s.notes.length || noteName(s.notes[0]) !== name) return key;
  }
  return name;
}

/** The scale from each starting note of a set, spelled from the name on its button. */
export const startScales = (fam: PriceFamily, set: PriceSet) =>
  set.keys.map((k, i) => ({ key: k, name: set.names[i], scale: buildScale(set.names[i], fam.familyId, 0) }));

/** Practice link for a key: /practice?k=G&f=aug */
export const practiceHref = (familyId: string, key: string) =>
  `/practice?${new URLSearchParams({ k: key, f: familyId })}`;

/** Sounds link that opens the family view: /sounds?sym=aug&k=G */
export const priceHref = (familyId: string, key: string) =>
  `/sounds?${new URLSearchParams({ sym: familyId, k: key })}#price-of-one`;

export const familyLabel = (id: PriceFamilyId) => familyById(id).short;
export { notePretty };
