/**
 * Symmetrical six-note scales: the ones whose pattern repeats evenly inside
 * the octave, so moving them up by that distance gives back the same notes.
 *
 * There are exactly five, counted by transposition (a scale and its upside-
 * down mirror count separately when they are not the same shape, which is why
 * Petrushka and the "no common name" scale are both here).
 * tests/symmetric.test.ts checks this by trying all 924 six-note sets.
 *
 *   whole tone       repeats every whole step    2 different ones
 *   augmented        repeats every major third   4
 *   Petrushka        repeats every tritone       6
 *   Messiaen mode 5  repeats every tritone       6
 *   no common name   repeats every tritone       6
 *
 * The octatonic (diminished) scale is symmetrical too, but it has eight notes.
 */

import { findChords, tertianOnly } from "./chords";
import { spellTriadIn } from "./pairAtlas";
import { Note, noteName, pc } from "./note";
import { familiesIn } from "./scales";

const mod12 = (x: number) => ((x % 12) + 12) % 12;

/** The smallest shift, in semitones, that maps the set onto itself (12 if none). */
export function repeatsEvery(pcs: number[]): number {
  const set = new Set(pcs.map(mod12));
  for (let n = 1; n < 12; n++) if ([...set].every((p) => set.has(mod12(p + n)))) return n;
  return 12;
}

/** How many different transpositions the set has: 12 unless it repeats. */
export const transpositions = (pcs: number[]) => repeatsEvery(pcs);

/** A transposition class: the set moved to start on 0, its smallest reading. */
export function transpositionClass(pcs: number[]): string {
  const s = [...new Set(pcs.map(mod12))];
  let best: number[] | null = null;
  for (const r of s) {
    const t = s.map((p) => mod12(p - r)).sort((a, b) => a - b);
    if (!best || t.join(",") < best.join(",")) best = t;
  }
  return (best ?? []).join(",");
}

/** Every six-note set that repeats inside the octave, by transposition class. */
export function symmetricHexachordClasses(): string[] {
  const out = new Set<string>();
  for (let mask = 0; mask < 1 << 12; mask++) {
    const pcs = [...Array(12).keys()].filter((i) => mask & (1 << i));
    if (pcs.length !== 6 || repeatsEvery(pcs) === 12) continue;
    out.add(transpositionClass(pcs));
  }
  return [...out].sort();
}

/** The app's symmetrical families, in menu order. */
export const symmetricalFamilies = () => familiesIn("symmetric");

const DISTANCE: Record<number, string> = {
  1: "half step", 2: "whole step", 3: "minor third", 4: "major third", 6: "tritone",
};

/** "Repeats every major third: only 4 different ones exist." */
export function symmetryLine(pcs: number[]): string | null {
  const n = repeatsEvery(pcs);
  if (n === 12) return null;
  return `Repeats every ${DISTANCE[n] ?? `${n} half steps`}: only ${n} different ones exist.`;
}

const pretty = (s: string) => s.replace(/##/g, "𝄪").replace(/#/g, "♯").replace(/b/g, "♭");
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/**
 * One plain line about the three-note chords of the whole-tone and augmented
 * scales, computed from the scale on screen. Null for any other scale.
 *   augmented:  "The augmented scale holds two augmented chords, plus major
 *                and minor chords on G, B and E♭."
 *   whole tone: "Whole tone holds only two three-note chords, both augmented:
 *                G+ (G B D♯) and F+ (F A C♯). Each is one chord seen from
 *                three roots: G+ = B+ = D♯+, and F+ = A+ = C♯+."
 */
export function symmetricTriadLine(familyId: string, notes: Note[]): string | null {
  if (!notes.length || (familyId !== "aug" && familyId !== "whole")) return null;
  const triads = tertianOnly(findChords(notes, [3]));
  const aug = triads.filter((c) => c.names.some((n) => n.symbol.endsWith("aug")));
  const scaleName = (p: number) => { const n = notes.find((x) => pc(x) === p); return n ? noteName(n) : "?"; };
  const order = (ps: number[]) => [...ps].sort((a, b) => mod12(a - pc(notes[0])) - mod12(b - pc(notes[0])));
  if (familyId === "aug") {
    /* roots named as the scale names them: "E♭" in G A♯ B D E♭ F♯ */
    const roots = (suffix: "" | "m") => order(triads
      .flatMap((c) => c.names.filter((n) => n.symbol === n.root + suffix))
      .map((n) => pc(n.voicing[0])));
    const major = roots(""), minor = roots("m");
    const same = major.join() === minor.join();
    const say = (ps: number[]) => list(ps.map((p) => pretty(scaleName(p))));
    const where = same
      ? `major and minor chords on ${say(major)}`
      : `major chords on ${say(major)} and minor chords on ${say(minor)}`;
    return `The augmented scale holds ${aug.length === 2 ? "two" : aug.length} augmented chords, plus ${where}.`;
  }
  /* Whole tone: every triad is augmented, and each is three roots of one
     chord. The tonic's chord first, then the one on the note just above the
     tonic, each spelled as a triad from its root (A C♯ E♯), with the scale's
     own letter noted ("E♯ written F in the scale"). */
  const own = new Set(notes.map(noteName));
  const sets = [...aug].sort((a, b) => Number(b.pcs.includes(pc(notes[0]))) - Number(a.pcs.includes(pc(notes[0]))));
  const named = sets.map((c) => {
    const roots = order(c.pcs);
    const spelled = spellTriadIn(c.pcs[0], "aug", notes);
    const lead = spelled
      ? { root: noteName(spelled.notes[0]), notes: spelled.notes.map(noteName), rootPc: pc(spelled.notes[0]) }
      : { root: c.names[0].root, notes: c.names[0].notes, rootPc: pc(c.names[0].voicing[0]) };
    const start = roots.indexOf(lead.rootPc);
    const rotated = start > 0 ? [...roots.slice(start), ...roots.slice(0, start)] : roots;
    const foreign = lead.notes.filter((x) => !own.has(x));
    const written = foreign.map((x) => {
      const p = pc({ letter: x[0] as Note["letter"], alt: (x.length - 1) * (x.includes("#") ? 1 : -1) as Note["alt"], octave: 4 });
      return `${pretty(x)} written ${pretty(scaleName(p))} in the scale`;
    });
    return {
      head: `${pretty(lead.root)}+ (${lead.notes.map(pretty).join(" ")}${written.length ? `, ${list(written)}` : ""})`,
      same: rotated.map((p, i) => `${pretty(i === 0 ? lead.root : scaleName(p))}+`).join(" = "),
    };
  });
  const count = triads.length === aug.length && aug.length === 2 ? "only two three-note chords, both augmented" : `${aug.length} augmented chords`;
  return `Whole tone holds ${count}: ${list(named.map((x) => x.head))}. Each is one chord seen from three roots: ${list(named.map((x) => x.same))}.`;
}
