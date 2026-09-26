/**
 * An ear-game "program": every note of one prompt or one reveal, with its time
 * in seconds from the start. Pure data, so the tests can check what will
 * actually sound (the missing note really is missing, the accents really fall
 * every N) without an AudioContext.
 *
 * `mark` says which chip lights while the event sounds, so the reveal can show
 * each note as it is heard.
 */

export interface Mark {
  row: string;
  chips: number[];
}

export interface EarEvent {
  at: number;
  dur: number;
  midis: number[];
  vel: number;
  /** seconds between the notes of a stack (a rolled chord) */
  spread?: number;
  mark?: Mark;
  /** part of the melody (not the drone or the cadence) */
  melody?: boolean;
  accent?: boolean;
}

export interface Phase {
  at: number;
  label: string;
}

export interface EarProgram {
  events: EarEvent[];
  phases: Phase[];
  /** when the last note starts plus its length */
  length: number;
}

export class ProgramBuilder {
  events: EarEvent[] = [];
  phases: Phase[] = [];
  t = 0;

  phase(label: string) {
    this.phases.push({ at: this.t, label });
    return this;
  }
  add(e: Omit<EarEvent, "at">, at = this.t) {
    this.events.push({ ...e, at });
    return this;
  }
  wait(s: number) {
    this.t += s;
    return this;
  }
  /** A quiet low tonic under everything from `from` to `to`. A piano cannot
   *  sustain, so it is struck again, but seldom and softer each time: the
   *  first strike sets the key, the rest only keep it in the ear. Frequent
   *  re-strikes read as a thumping bass line, not a drone. */
  drone(tonic: number, from: number, to: number) {
    const every = 3.4;
    let k = 0;
    for (let at = from; at < to - 0.2; at += every, k++)
      this.events.push({
        at, dur: Math.min(every + 0.6, to - at + 0.6),
        midis: [tonic - 24, tonic - 12], vel: k === 0 ? 0.32 : 0.22, spread: 0,
      });
    return this;
  }
  build(): EarProgram {
    const events = [...this.events].sort((a, b) => a.at - b.at);
    const length = events.reduce(
      (m, e) => Math.max(m, e.at + (e.spread ?? 0) * (e.midis.length - 1) + e.dur), 0);
    return { events, phases: [...this.phases].sort((a, b) => a.at - b.at), length };
  }
}

/** Offsets for a I–IV–V–I in a major key, or i–iv–v–i in natural minor. The
 *  minor cadence keeps the ♭7 (a minor v), so the cadence never plays a note
 *  that is not in the natural-minor scale being tested. */
export function cadenceChords(tonic: number, minor: boolean): number[][] {
  const third = minor ? 3 : 4;
  const sixth = minor ? 8 : 9;
  const seventh = minor ? -2 : -1;
  const up = tonic + 12;
  return [
    [tonic - 12, up, up + third, up + 7],
    [tonic - 7, up, up + 5, up + sixth],
    [tonic - 5, up + seventh, up + 2, up + 7],
    [tonic - 12, up, up + third, up + 7],
  ];
}

/** Every note of a set of chords, as pitch classes relative to the tonic. */
export const relPcs = (tonic: number, midis: number[]) =>
  [...new Set(midis.map((m) => (((m - tonic) % 12) + 12) % 12))].sort((a, b) => a - b);
