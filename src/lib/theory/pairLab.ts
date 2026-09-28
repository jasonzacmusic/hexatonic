/**
 * The pair lab's material and its link, kept pure for the tests: what the
 * movement lab plays (the ladder or the scale, on a rhythm, with or without
 * the left hand), and how a /harmony?tab=pairs link names it.
 */

import { midi, Note, notePretty } from "./note";
import { LadderDirection, ladderEvents, pairLadder, scaleEvents, scaleLine, TwoChordPair } from "./pairAtlas";
import { isRhythmMode, layOnCell, RhythmMode } from "./rhythmCell";

export type Material = "ladder" | "scale";
export type Voicing = "block" | "arpeggio";

export interface LabSettings {
  bpm: number;
  voicing: Voicing;
  dir: LadderDirection;
  material: Material;
  rhythm: RhythmMode;
  /** left hand plays the scale under the ladder */
  lh: boolean;
}

export const LAB_DEFAULTS: LabSettings = {
  bpm: 76, voicing: "block", dir: "up-down", material: "ladder", rhythm: "straight", lh: false,
};

/** One thing struck: a chord of the ladder, or a note of the scale. */
export interface Item {
  label: string;
  rh: Note[];
  lh: Note[];
  shape: 0 | 1;
  /** ladder step, or scale degree (0–6) */
  step: number;
}

/** The material, laid out in time. Pure, so the tests can check it. */
export function labMaterial(pair: TwoChordPair, s: Pick<LabSettings, "dir" | "material" | "rhythm" | "lh">) {
  const steps = pairLadder(pair);
  /* The left hand's scale sits below the first chord: its top note (the
     tonic an octave up) is never above the ladder's lowest note. */
  const lhLine = scaleLine(pair, steps[0].voicing[0] - 23);
  let items: (Item | null)[];
  if (s.material === "ladder") {
    const all = ladderEvents(steps, s.dir);
    const evs = s.rhythm === "straight" ? all : all.filter((e) => e.step !== null);
    items = evs.map((e, i) => e.step === null ? null : {
      label: e.label, rh: steps[e.step].notes, lh: s.lh && lhLine[i] ? [lhLine[i]] : [],
      shape: e.shape as 0 | 1, step: e.step,
    });
  } else {
    const sc = scaleEvents(pair);
    items = scaleLine(pair).map((n, i) => ({
      label: notePretty(n), rh: [n], lh: [], shape: sc[i].shape as 0 | 1, step: sc[i].step as number,
    }));
  }
  const layout = layOnCell(items, s.rhythm);
  return { steps, lhLine, items, layout };
}

/* ── the link: every view of this tab is shareable ─────────────────────────
   /harmony?tab=pairs&src=six&k=G&s=diatonic-3&pair=G-Am&bpm=76&v=block
   src   six | parent          k    the key            s  scale or parent id
   pair  G-Am, Em-D, Gaug-Bbaug (or the pair id)      bpm 40–160
   v     block | arpeggio      dir  both | up         m  ladder | scale
   rh    straight | cell1 | gap (Rhythm cell 1 + a hands-off bar)   lh 1 = left hand plays the scale
   A link always beats what was remembered, then becomes what is remembered. */
const RH_LINK: Record<string, RhythmMode> = { straight: "straight", cell1: "cell1", gap: "cell1-gap", "cell1-gap": "cell1-gap" };
export const RH_OUT: Record<RhythmMode, string> = { straight: "straight", cell1: "cell1", "cell1-gap": "gap" };

export function labFromLink(q: URLSearchParams): Partial<LabSettings> {
  const out: Partial<LabSettings> = {};
  const bpm = Number(q.get("bpm"));
  if (Number.isInteger(bpm) && bpm >= 40 && bpm <= 160) out.bpm = bpm;
  const v = q.get("v");
  if (v === "block") out.voicing = "block";
  if (v === "arpeggio" || v === "arp") out.voicing = "arpeggio";
  const dir = q.get("dir");
  if (dir === "up") out.dir = "up";
  if (dir === "both" || dir === "up-down") out.dir = "up-down";
  const m = q.get("m");
  if (m === "ladder" || m === "scale") out.material = m;
  const rh = RH_LINK[q.get("rh") ?? ""];
  if (rh && isRhythmMode(rh)) out.rhythm = rh;
  if (q.get("lh") === "1") out.lh = true;
  if (q.get("lh") === "0") out.lh = false;
  return out;
}
