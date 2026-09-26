/**
 * The home page's "Tap to hear" strip: eight six-note sounds that show the
 * widest variety fastest (major, minor, the Sunday Scale, both blues, the two
 * symmetric scales and one colour scale), built in whichever key is picked.
 *
 * Names, characters and spellings all come from buildScale, so the strip
 * matches every other page. tests/sound-strip.test.ts checks all eight in all
 * twelve keys: no double accidentals, and the notes shown are the notes played.
 */

import { buildScale, ScaleInstance } from "./scales";
import { midi } from "./note";

export const STRIP_DEFS: { id: string; fam: string; mode: number }[] = [
  { id: "major", fam: "diatonic", mode: 0 },
  { id: "minor", fam: "diatonic", mode: 4 },
  { id: "sunday", fam: "diatonic", mode: 3 },
  { id: "blues", fam: "blues", mode: 0 },
  { id: "major-blues", fam: "blues-major", mode: 0 },
  { id: "whole", fam: "whole", mode: 0 },
  { id: "aug", fam: "aug", mode: 0 },
  { id: "prometheus", fam: "prometheus", mode: 0 },
];

export interface StripSound {
  id: string;
  fam: string;
  mode: number;
  scale: ScaleInstance;
  name: string;
  character: string;
  /** Up the scale and land on the tonic an octave higher. */
  midis: number[];
  /** Practice link for this sound in this key. */
  practice: string;
}

export function stripSounds(key: string): StripSound[] {
  return STRIP_DEFS.map((s) => {
    const scale = buildScale(key, s.fam, s.mode);
    const md = scale.family.modes?.[s.mode];
    const q = new URLSearchParams({ k: key, f: s.fam });
    if (scale.family.kind === "rotation") q.set("m", String(s.mode));
    const m = scale.notes.map(midi);
    return {
      ...s,
      scale,
      name: md ? md.name : scale.family.short,
      character: md ? md.character : scale.family.character,
      midis: m.length ? [...m, m[0] + 12] : [],
      practice: `/practice?${q}`,
    };
  });
}
