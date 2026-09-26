"use client";

/**
 * The scales the Harmony page works on, and the picker for them.
 * Built from the scale families the app actually has, so a family that leaves
 * the library simply leaves this menu too.
 *
 * Every option shows its degrees in the same format ("Blues · 1 ♭3 4 ♭5 5 ♭7"),
 * computed from the scale itself, spelled by letter, never typed by hand.
 * tests/harmony-scale-options.test.ts locks them.
 *
 * Imports are relative (not "@/") so the tests can load this file.
 */

import {
  buildScale, DIATONIC_MODES, FAMILIES, FAMILY_GROUPS, FamilyGroup, KEYS, ScaleInstance,
} from "../../lib/theory/scales";
import { letterIndex, Letter, Note, noteName, notePretty, pc } from "../../lib/theory/note";
import type { ChordSet, ThirdsStack } from "../../lib/theory/chords";

export interface ScaleOption {
  id: string;
  label: string;
  /** The menu group it sits in: "Remove one note", "Symmetric"… */
  group: string;
  build: (key: string) => ScaleInstance;
}

export const prettyDegrees = (d: string) => d.replace(/b/g, "♭").replace(/#/g, "♯");

/** Major-scale semitones for each letter step: the yardstick for ♭ and ♯. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const acc = (d: number) => (d < 0 ? "♭".repeat(-d) : "♯".repeat(d));

/**
 * The degrees of a spelled scale, read by letter: C D E F♯ G♯ B♭ is
 * "1 2 3 ♯4 ♯5 ♭7", not "1 2 3 ♭5 ♭6 ♭7". The letter gives the number, the
 * distance from the tonic gives the ♭ or ♯.
 */
export function degreeLabels(notes: Note[]): string {
  const t = notes[0];
  if (!t) return "";
  return notes.map((n) => {
    const step = (letterIndex(n.letter) - letterIndex(t.letter) + 7) % 7;
    const semis = (((pc(n) - pc(t)) % 12) + 12) % 12;
    const diff = ((semis - MAJOR[step] + 18) % 12) - 6;
    return acc(diff) + (step + 1);
  }).join(" ");
}

/** Degrees are the same in every key; read them in C. */
const degreesIn = (build: (key: string) => ScaleInstance) => degreeLabels(build("C").notes);

/**
 * A fixed family's degrees, read from its own spelling template (semitones and
 * letter steps), so no key's respelling can change them. Where the family has
 * more than one correct template (Petrushka), take the first that leaves the
 * tonic unaltered: a degree formula never has a ♯1.
 */
function templateDegrees(semis: number[], templates: number[][]): string {
  const t = templates.find((ls) => ls.every((l, i) => l !== 0 || semis[i] === 0)) ?? templates[0];
  return t.map((l, i) => acc(((semis[i] - MAJOR[l] + 18) % 12) - 6) + (l + 1)).join(" ");
}

const groupLabel = (g: FamilyGroup) => FAMILY_GROUPS.find((x) => x.id === g)?.label ?? g;

/** The menu groups, in order. Each family appears under its own group. */
export const MENU_GROUPS: FamilyGroup[] = ["remove", "pentatonic", "symmetric", "colour", "beyond"];

function familyOptions(g: FamilyGroup): ScaleOption[] {
  const out: ScaleOption[] = [];
  for (const f of FAMILIES.filter((x) => x.group === g)) {
    if (f.id === "diatonic") {
      for (const m of DIATONIC_MODES) {
        const build = (key: string) => buildScale(key, "diatonic", m.index);
        out.push({ id: `d${m.index}`, label: `${m.name} · ${degreesIn(build)}`, group: groupLabel(g), build });
      }
      /* One more "remove one note" colour the library builds by hand. */
      const build = (key: string) => ({ ...buildScale(key, "custom", 0, [0, 2, 3, 5, 7, 9]), label: "Minor, no 7th" });
      out.push({ id: "minor-no7", label: `Minor, no 7th · ${degreesIn(build)}`, group: groupLabel(g), build });
      continue;
    }
    const build = (key: string) => buildScale(key, f.id, 0);
    const degrees = f.semis && f.letters
      ? templateDegrees(f.semis, [f.letters, ...(f.letterAlts ?? [])])
      : degreesIn(build);
    out.push({ id: f.id, label: `${f.short} · ${degrees}`, group: groupLabel(g), build });
  }
  return out;
}

export const SCALE_OPTIONS: ScaleOption[] = MENU_GROUPS.flatMap(familyOptions);

export const optionById = (id: string) => SCALE_OPTIONS.find((o) => o.id === id) ?? SCALE_OPTIONS[0];

export function ScalePicker({
  idPrefix, keyName, setKey, optionId, setOption, options = SCALE_OPTIONS,
}: {
  idPrefix: string;
  keyName: string;
  setKey: (k: string) => void;
  optionId: string;
  setOption: (id: string) => void;
  options?: ScaleOption[];
}) {
  /* Keep the order the options arrive in, grouped under their headings. */
  const groups: [string, ScaleOption[]][] = [];
  for (const o of options) {
    const last = groups[groups.length - 1];
    if (last && last[0] === o.group) last[1].push(o);
    else groups.push([o.group, [o]]);
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="field w-[84px] shrink-0">
        <label htmlFor={`${idPrefix}-key`}>Key</label>
        <select id={`${idPrefix}-key`} className="sel" value={keyName} onChange={(e) => setKey(e.target.value)}>
          {KEYS.map((k) => <option key={k} value={k}>{prettyDegrees(k)}</option>)}
        </select>
      </div>
      <div className="field min-w-0 flex-1 basis-[220px]">
        <label htmlFor={`${idPrefix}-scale`}>Scale</label>
        <select id={`${idPrefix}-scale`} className="sel" value={optionId} onChange={(e) => setOption(e.target.value)}>
          {groups.map(([g, os]) => (
            <optgroup key={g} label={g}>
              {os.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Explanatory prose: 15px, cream at 75% or brighter (the legibility floor). */
export const PROSE = "max-w-[68ch] text-[15px] leading-relaxed text-cream/80";

/* ── computed sentences, kept here so the tests can read them ─────────── */

const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export const count = (n: number) => COUNT[n] ?? String(n);
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

const ORD: Record<string, string> = { "3": "3rd", "5": "5th", "7": "7th", "9": "9th", "11": "11th", "13": "13th" };

/** One computed sentence about the whole scale stacked in thirds. Works for
 *  five, six and seven notes alike. */
export function stackLine(stack: ThirdsStack, notes: Note[], removed: Note | null): string {
  const from = notePretty(notes[0]);
  if (!stack.degrees.length)
    return `This scale uses one letter twice, so it cannot stack purely in thirds. Stacked as close as it goes from ${from}: ${
      count(stack.thirds)} of the ${count(stack.gaps.length)} gaps are thirds.`;
  const chain = `Stacked in thirds from ${from}: ${stack.degrees.join(" ")}.`;
  if (!stack.missing.length) return `${chain} Every note is a chord tone of one chord.`;
  const gone = list(stack.missing.map((m) => `no ${ORD[m] ?? m}`));
  const why = removed && stack.missing.length === 1 ? `: that is ${notePretty(removed)}, the note this scale leaves out` : "";
  return `${chain} ${cap(gone)}${why}. Every note is still a chord tone of that one chord.`;
}

/* ── chord names on the Harmony page ──────────────────────────────────── */

/**
 * A symmetric chord has several correct names: G+ = B+ = D♯+. Lead with the
 * one spelled in the scale's own notes (same family only), so G whole tone
 * shows G+ as G B D♯, not E♭+ as E♭ G B when the scale has D♯.
 * Returns the chords and a lookup from the library's " = "-joined symbol.
 */
export function ownSpellingFirst(found: ChordSet[], scale: Note[]) {
  const own = new Set(scale.map(noteName));
  const bySymbol = new Map<string, ChordSet>();
  const chords = found.map((c) => {
    const lead = c.names.find((n) => n.family === c.names[0].family && n.notes.every((x) => own.has(x)));
    const out = !lead || lead === c.names[0] ? c
      : { ...c, names: [lead, ...c.names.filter((n) => n !== lead)], notes: lead.voicing, noteNames: lead.notes };
    bySymbol.set(c.names.map((x) => x.symbol).join(" = "), out);
    return out;
  });
  return { chords, bySymbol };
}

const ROLE_BY_STEP = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/**
 * The job a note does in a chord, read by letter from the chord's own
 * spelling: in B D F A♭ the A♭ is the 7th (a diminished 7th), in G B D E the
 * E is the 6th, though both sit nine semitones above the root.
 */
export function chordRole(chordNotes: string[], notePc: number): string {
  const toNote = (x: string): Note => {
    const alt = ({ "": 0, "#": 1, "##": 2, b: -1, bb: -2 } as Record<string, number>)[x.slice(1)] ?? 0;
    return { letter: x[0] as Letter, alt: alt as Note["alt"], octave: 4 };
  };
  const ns = chordNotes.map(toNote);
  const hit = ns.find((n) => pc(n) === notePc);
  if (!hit || !ns[0]) return "";
  const step = (n: Note) => (letterIndex(n.letter) - letterIndex(ns[0].letter) + 7) % 7;
  /* Read by letter only when the chord is spelled in stacked letters. A chord
     the library could not spell that way (A♭ B D) is read by semitones. */
  const stacked = ns.every((n) => [0, 2, 4, 5, 6].includes(step(n))) && new Set(ns.map(step)).size === ns.length;
  if (stacked) return ROLE_BY_STEP[step(hit)];
  return ROLE_BY_SEMIS[(((notePc - pc(ns[0])) % 12) + 12) % 12] ?? "";
}

/** The semitone reading, the same table the chord trees use. */
const ROLE_BY_SEMIS: Record<number, string> = {
  0: "root", 3: "3rd", 4: "3rd", 6: "5th", 7: "5th", 8: "5th", 9: "6th", 10: "7th", 11: "7th",
};
