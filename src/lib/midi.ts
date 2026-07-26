"use client";

/**
 * MIDI input and grading.
 *
 * The engine already knows the expected note at every tick, so grading is mostly
 * a matter of not lying about it. Two decisions worth stating:
 *
 * 1. WE GRADE PITCH CLASS, NOT OCTAVE. A student practising on a 61-key keyboard
 *    will play the drill wherever it sits under their hands. Marking that wrong
 *    would be pedantic and would make the feature useless on small controllers.
 *    Octave errors are reported separately, as information rather than as a miss.
 *
 * 2. TIMING IS JUDGED AGAINST THE AUDIO CLOCK, not against wall time or rAF.
 *    A note counts as belonging to the step whose window it falls in, where the
 *    window is centred on the step and half a step wide either side.
 */

import { Note, midi, pc, noteName } from "./theory/note";

export interface MidiEvent {
  midi: number;
  velocity: number;
  /** AudioContext time, so it lines up with the scheduler */
  at: number;
}

export type NoteVerdict = "correct" | "wrong" | "missed" | "extra";

export interface StepGrade {
  index: number;
  expected: number;      // pitch class
  expectedNote: string;
  played?: number;       // midi actually played
  playedNote?: string;
  verdict: NoteVerdict;
  /** signed offset in seconds; negative is early */
  offset?: number;
  /** true when the right pitch class was played in the wrong octave */
  octaveOff?: boolean;
  isAccent: boolean;
}

export interface GradeReport {
  steps: StepGrade[];
  total: number;
  correct: number;
  wrong: number;
  missed: number;
  extra: number;
  accuracy: number;          // 0..1 over expected notes
  accentAccuracy: number;    // 0..1 over accented notes only
  /** mean absolute timing error in ms, over correct notes */
  timingMs: number;
  /** positive = consistently late */
  biasMs: number;
  worstNotes: { note: string; misses: number }[];
}

export function grade(
  expected: Note[], accentEvery: number, events: MidiEvent[],
  startTime: number, stepDur: number
): GradeReport {
  const steps: StepGrade[] = expected.map((n, i) => ({
    index: i,
    expected: pc(n),
    expectedNote: noteName(n),
    verdict: "missed" as NoteVerdict,
    isAccent: i % accentEvery === 0,
  }));

  const used = new Set<number>();
  for (const [ei, ev] of events.entries()) {
    const raw = (ev.at - startTime) / stepDur;
    const idx = Math.round(raw);
    if (idx < 0 || idx >= steps.length) continue;
    if (Math.abs(raw - idx) > 0.5) continue;         // outside this step's window
    const s = steps[idx];
    if (s.verdict !== "missed") continue;            // first note in the window wins
    const hit = ((ev.midi % 12) + 12) % 12 === s.expected;
    s.played = ev.midi;
    s.playedNote = noteName(expected[idx]);
    s.offset = ev.at - (startTime + idx * stepDur);
    s.verdict = hit ? "correct" : "wrong";
    s.octaveOff = hit && ev.midi !== midi(expected[idx]);
    used.add(ei);
  }

  const extra = events.length - used.size;
  const correct = steps.filter((s) => s.verdict === "correct").length;
  const wrong = steps.filter((s) => s.verdict === "wrong").length;
  const missed = steps.filter((s) => s.verdict === "missed").length;
  const accents = steps.filter((s) => s.isAccent);
  const offsets = steps.filter((s) => s.verdict === "correct" && s.offset !== undefined)
                       .map((s) => s.offset!);

  const missCount = new Map<string, number>();
  for (const s of steps)
    if (s.verdict !== "correct")
      missCount.set(s.expectedNote, (missCount.get(s.expectedNote) ?? 0) + 1);

  return {
    steps, total: steps.length, correct, wrong, missed, extra,
    accuracy: steps.length ? correct / steps.length : 0,
    accentAccuracy: accents.length
      ? accents.filter((s) => s.verdict === "correct").length / accents.length : 0,
    timingMs: offsets.length
      ? (offsets.reduce((a, b) => a + Math.abs(b), 0) / offsets.length) * 1000 : 0,
    biasMs: offsets.length
      ? (offsets.reduce((a, b) => a + b, 0) / offsets.length) * 1000 : 0,
    worstNotes: [...missCount.entries()]
      .map(([note, misses]) => ({ note, misses }))
      .sort((a, b) => b.misses - a.misses)
      .slice(0, 3),
  };
}

/* ── the Web MIDI plumbing ─────────────────────────────────────────────── */

export interface MidiPort { id: string; name: string }

export class MidiInput {
  private access: MIDIAccess | null = null;
  private current: MIDIInput | null = null;
  private buffer: MidiEvent[] = [];
  private nowFn: () => number = () => performance.now() / 1000;

  ports: MidiPort[] = [];
  supported = typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
  error: string | null = null;

  onNote?: (m: number, velocity: number) => void;

  /** Feed the AudioContext clock in so grading lines up with the scheduler. */
  useClock(fn: () => number) { this.nowFn = fn; }

  async connect(): Promise<MidiPort[]> {
    if (!this.supported) { this.error = "This browser has no Web MIDI."; return []; }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      this.error = "MIDI permission was refused.";
      return [];
    }
    this.refresh();
    this.access.onstatechange = () => this.refresh();
    return this.ports;
  }

  private refresh() {
    if (!this.access) return;
    this.ports = [...this.access.inputs.values()].map((i) => ({
      id: i.id, name: i.name ?? "unnamed",
    }));
    if (!this.current && this.ports.length) this.select(this.ports[0].id);
  }

  select(id: string) {
    if (!this.access) return;
    if (this.current) this.current.onmidimessage = null;
    this.current = this.access.inputs.get(id) ?? null;
    if (!this.current) return;
    this.current.onmidimessage = (e) => {
      const data = e.data;
      if (!data || data.length < 3) return;
      const status = data[0], note = data[1], vel = data[2];
      // 0x90 with velocity 0 is a note-off on many controllers
      if ((status & 0xf0) === 0x90 && vel > 0) {
        this.buffer.push({ midi: note, velocity: vel, at: this.nowFn() });
        this.onNote?.(note, vel);
      }
    };
  }

  get selectedId() { return this.current?.id ?? null; }
  startCapture() { this.buffer = []; }
  captured(): MidiEvent[] { return [...this.buffer]; }
  disconnect() {
    if (this.current) this.current.onmidimessage = null;
    this.current = null;
  }
}

let singleton: MidiInput | null = null;
export const getMidi = () => (singleton ??= new MidiInput());
