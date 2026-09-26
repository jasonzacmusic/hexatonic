/**
 * Audio engine — real Salamander grand piano samples.
 *
 * Three rules learned the hard way:
 *
 * 1. Audio correctness must NOT depend on requestAnimationFrame. rAF is throttled
 *    hard when the tab loses focus, which silently broke looping — the drill ran
 *    hundreds of notes past its loop point and never re-scheduled. A setInterval
 *    LOOKAHEAD SCHEDULER owns the audio; rAF only paints the highlight.
 * 2. Everything is scheduled against AudioContext.currentTime, never setTimeout.
 * 3. Changing a setting never stops the music. The scheduler reads the CURRENT
 *    plan from a live timeline (./timeline.ts) every time it schedules ahead;
 *    `update()` / `updateVamp()` hand it new settings, which land on the next
 *    beat (tempo, click, swing, mix) or the next bar (everything else).
 */

import { midi, Note } from "../theory/note";
import { Grid, LiveTimeline, Step } from "./timeline";

const SAMPLES: Record<number, string> = {
  36: "C2", 39: "Ds2", 42: "Fs2", 45: "A2",
  48: "C3", 51: "Ds3", 54: "Fs3", 57: "A3",
  60: "C4", 63: "Ds4", 66: "Fs4", 69: "A4",
  72: "C5", 75: "Ds5", 78: "Fs5", 81: "A5",
  84: "C6",
};

export interface ScheduledNote {
  midi: number;
  /** index in the drill, used for accents and highlighting */
  index: number;
}

/** Everything about a drill that may change while it plays. */
export interface DrillPlan {
  /** spelled notes; MIDI is derived only at the audio boundary. null = a rest —
   *  the pulse advances, the click still sounds, nothing is struck. */
  notes: (Note | null)[];
  /** chord stacks (MIDI) per step. When given, these sound instead of `notes`. */
  chords?: (number[] | null)[];
  /** seconds between the notes of a stack — 0 for a block chord */
  spread?: number;
  /** per-step accents; by default every `grouping`-th step is accented */
  accents?: boolean[];
  stepDur: number;          // seconds per note
  grouping: number;         // accent every N
  subdivision: number;      // notes per beat (for the click)
  beatsPerBar?: number;
  /** shuffle: with 8th subdivisions, offbeats land a triplet late (2:1) */
  swing?: boolean;
  loop: boolean;
  click: boolean;
}

export interface PlaybackOptions extends DrillPlan {
  countInBeats: number;
  beatDur: number;
  onStop?: () => void;
}

/** Where a running drill is, read from the audio clock. */
export interface DrillPosition {
  /** step within the sounding material */
  index: number;
  bar: number;
  bars: number;
  beat: number;
  beats: number;
  /** a change was accepted and lands on the next beat or bar */
  pending: boolean;
  next: "beat" | "bar" | null;
  /** the plan sounding right now — the very object passed to start or update */
  plan: DrillPlan;
  /** one stretch of music with one set of settings (for grading MIDI takes) */
  segment: { id: number; start: number; firstPos: number; stepDur: number };
  /** changes whenever the sounding plan object changes */
  rev: number;
}

const LOOKAHEAD = 3.0;
const TICK_MS = 400;
/** The earliest a live change may land: enough to schedule the seam cleanly. */
const SEAM_LEAD = 0.06;

export interface VampChord {
  bass: number;
  voicing: number[];
  bars: number;
}

/** Everything about a vamp that may change while it plays. */
export interface VampPlan {
  chords: VampChord[];
  beatDur: number;
  beatsPerBar: number;
  feel: "straight" | "swing" | "68";
  click: boolean;
  bassOn: boolean;
  compOn: boolean;
}

export interface VampOptions extends VampPlan {
  countInBeats: number;
}

export interface VampPosition {
  /** index into the sounding plan's chords */
  chordIndex: number;
  /** bar within one pass of the progression */
  bar: number;
  bars: number;
  beat: number;
  beats: number;
  pending: boolean;
  next: "beat" | "bar" | null;
  /** the plan sounding right now — the very object passed to startVamp or updateVamp */
  plan: VampPlan;
  /** changes whenever the sounding plan object changes */
  rev: number;
}

/* ── how a plan becomes a timeline ─────────────────────────────────────── */

interface CompiledDrill { src: DrillPlan; steps: (number[] | null)[] }
interface CompiledVamp { src: VampPlan; barChord: number[] }

const sameStack = (a: (number[] | null)[], b: (number[] | null)[]) =>
  a.length === b.length && a.every((x, i) => {
    const y = b[i];
    if (!x || !y) return x === y;
    return x.length === y.length && x.every((m, j) => m === y[j]);
  });
const sameFlags = (a?: boolean[], b?: boolean[]) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]));

export const compileDrill = (src: DrillPlan): CompiledDrill => ({
  src,
  steps: src.chords ?? src.notes.map((n) => (n ? [midi(n)] : null)),
});
export const drillGrid = ({ src, steps }: CompiledDrill): Grid => ({
  stepDur: src.stepDur,
  beatSteps: src.subdivision,
  barSteps: src.subdivision * (src.beatsPerBar ?? 4),
  length: steps.length,
  loop: src.loop,
});
/** Same material = same notes, accents and bar shape. Tempo, click and swing are feel. */
export const sameDrillMaterial = (a: CompiledDrill, b: CompiledDrill) =>
  sameStack(a.steps, b.steps) &&
  a.src.grouping === b.src.grouping &&
  a.src.subdivision === b.src.subdivision &&
  (a.src.beatsPerBar ?? 4) === (b.src.beatsPerBar ?? 4) &&
  sameFlags(a.src.accents, b.src.accents);
const sameDrillPlan = (a: CompiledDrill, b: CompiledDrill) =>
  sameDrillMaterial(a, b) &&
  a.src.stepDur === b.src.stepDur && !!a.src.swing === !!b.src.swing &&
  a.src.loop === b.src.loop && a.src.click === b.src.click &&
  (a.src.spread ?? 0) === (b.src.spread ?? 0);

export const compileVamp = (src: VampPlan): CompiledVamp => ({
  src,
  barChord: src.chords.flatMap((c, i) => Array.from({ length: Math.max(1, c.bars) }, () => i)),
});
export const vampGrid = ({ src, barChord }: CompiledVamp): Grid => ({
  stepDur: src.beatDur,
  beatSteps: 1,
  barSteps: src.beatsPerBar,
  length: barChord.length * src.beatsPerBar,
  loop: true,
});
/** Same material = same chords, bars and feel. Tempo, click and the mix are not. */
export const sameVampMaterial = (a: CompiledVamp, b: CompiledVamp) =>
  a.src.beatsPerBar === b.src.beatsPerBar && a.src.feel === b.src.feel &&
  a.src.chords.length === b.src.chords.length &&
  a.src.chords.every((c, i) => {
    const d = b.src.chords[i];
    return c.bass === d.bass && c.bars === d.bars &&
      c.voicing.length === d.voicing.length && c.voicing.every((m, j) => m === d.voicing[j]);
  });
const sameVampPlan = (a: CompiledVamp, b: CompiledVamp) =>
  sameVampMaterial(a, b) && a.src.beatDur === b.src.beatDur && a.src.click === b.src.click &&
  a.src.bassOn === b.src.bassOn && a.src.compOn === b.src.compOn;

/** Comp patterns, in beats from the top of the bar.
 *  Kept deliberately sparse — this is a bed to improvise over, not a performance
 *  competing with the student. */
/* Beat positions carrying a fraction of .5 are OFFBEATS, and in the swing feel
 * those are the hits the triplet shift moves. The swing pattern used to be
 * [1, 3] — both whole beats — so the shift below could never fire and the swing
 * feel came out perfectly straight. Beat 2 plus an anticipation on the swung
 * "and of 4" is the standard two-feel comp and makes the shift audible. */
/* 6/8 is six eighth-note beats in two groups of three. The old pattern
 * ([0, 1, 2] and bass [0, 1.5]) was written for one group, so beats 4–6 of
 * every bar were silent. The lilt is long–short in each half: a chord on the
 * group's first beat and a lighter one on its third, the bass on 1 and 4. */
export const COMP: Record<string, { chord: number[]; bass: number[] }> = {
  straight: { chord: [0, 1.5, 2.5], bass: [0, 2] },
  swing:    { chord: [1, 3.5],      bass: [0, 1, 2, 3] },
  "68":     { chord: [0, 2, 3, 5],  bass: [0, 3] },
};

type Scheduled = Map<AudioScheduledSourceNode, number>;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private clickBus: GainNode | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private samplePromises = new Map<number, Promise<void>>();
  private failedSamples = new Set<number>();
  private sampleBasePath = "/audio/salamander";
  private timer: ReturnType<typeof setInterval> | null = null;
  private opts: PlaybackOptions | null = null;
  private drill: LiveTimeline<CompiledDrill> | null = null;
  /** drill sources by start time, so a live change can cancel what lies past the seam */
  private drillNodes: Scheduled = new Map();
  /** steps scheduled so far (net of any a live change cancelled) */
  private queued = 0;
  private upcomingSteps: number[] = [];
  private lastOrigin = 0;
  private requestId = 0;
  private previewId = 0;
  private live = new Set<AudioScheduledSourceNode>();
  private fallbackNotes = 0;

  ready = false;
  playing = false;
  vamping = false;
  private vampOpts: VampOptions | null = null;
  private vamp: LiveTimeline<CompiledVamp> | null = null;
  private vampNodes: Scheduled = new Map();
  private vampTimer: ReturnType<typeof setInterval> | null = null;

  get context() { return this.ctx; }
  /** When the first drill note sounds (the count-in ends). */
  get startTime() { return this.drill?.origin ?? this.lastOrigin; }
  get loadedSamples() { return this.buffers.size; }
  get totalSamples() { return Object.keys(SAMPLES).length; }
  get liveNodeCount() { return this.live.size; }
  get loading() { return this.samplePromises.size > 0; }
  get fullyLoaded() { return this.buffers.size === this.totalSamples; }
  get sampleFailures() { return this.failedSamples.size; }
  get fallbackNoteCount() { return this.fallbackNotes; }

  private ensureContext() {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio is not supported in this browser.");
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.clickBus = this.ctx.createGain();
    this.clickBus.gain.value = 0.3;
    this.clickBus.connect(this.ctx.destination);
  }

  /**
   * Start fetching samples without making playback depend on the network.
   * The notes needed by the current drill are requested first; every missing
   * file loads independently, so one bad response can never mute the app.
   */
  private beginSampleLoading(priorityMidis: number[] = []) {
    if (!this.ctx) return;
    const keys = Object.keys(SAMPLES).map(Number);
    const priority = new Set<number>();
    for (const m of priorityMidis) {
      let nearest = keys[0];
      for (const key of keys)
        if (Math.abs(m - key) < Math.abs(m - nearest)) nearest = key;
      priority.add(nearest);
    }
    const ordered = [...priority, ...keys.filter((key) => !priority.has(key))];
    for (const key of ordered) this.loadSample(key);
  }

  private loadSample(key: number) {
    if (!this.ctx || this.buffers.has(key) || this.samplePromises.has(key)) return;
    const name = SAMPLES[key];
    if (!name) return;
    const task = (async () => {
      try {
        const res = await fetch(`${this.sampleBasePath}/${name}.mp3`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`sample ${name} failed (${res.status})`);
        const decoded = await this.ctx!.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(key, decoded);
        this.failedSamples.delete(key);
      } catch {
        // Keep the transport alive on its synthesized fallback. A later Play or
        // preview retries only the missing file.
        this.failedSamples.add(key);
      } finally {
        this.samplePromises.delete(key);
      }
    })();
    this.samplePromises.set(key, task);
  }

  /** Test/diagnostic hook: playback never waits on this. */
  async waitForSampleLoading() {
    while (this.samplePromises.size)
      await Promise.allSettled([...this.samplePromises.values()]);
  }

  async init(basePath = "/audio/salamander", priorityMidis: number[] = []): Promise<void> {
    this.sampleBasePath = basePath;
    this.ensureContext();

    // Resume is invoked before the first await so iOS can associate it with the
    // current user gesture. Downloads continue independently in the background.
    const resume = this.resume();
    this.beginSampleLoading(priorityMidis);
    const running = await resume;
    if (!running)
      throw new Error("Audio is blocked by the browser. Tap Play once more to enable it.");
    this.ready = true;
  }

  private unlock() {
    if (!this.ctx || !this.master) return;
    // A zero-gain source created inside the gesture unlocks older iOS Web Audio
    // implementations without producing a click.
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.008);
  }

  /** Resume after a tab-visibility change — the AudioContext suspend trap. */
  async resume(): Promise<boolean> {
    if (!this.ctx) return false;
    try {
      this.unlock();
      if (this.ctx.state !== "running")
        await this.ctx.resume();
    } catch {
      return false;
    }
    return this.ctx.state === "running";
  }

  private nearest(m: number): { key: number; distance: number } | null {
    let best = 0, bd = Infinity;
    for (const k of this.buffers.keys()) {
      const d = Math.abs(m - k);
      if (d < bd) { bd = d; best = k; }
    }
    return Number.isFinite(bd) ? { key: best, distance: bd } : null;
  }

  note(m: number, when: number, dur: number, vel = 0.8, into?: Scheduled) {
    if (!this.ctx || !this.master) return;
    const nearest = this.nearest(m);
    const buf = nearest && nearest.distance <= 12 ? this.buffers.get(nearest.key) : null;
    if (!buf || !nearest) {
      this.synthNote(m, when, dur, vel, into);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (m - nearest.key) / 12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + 0.006);
    g.gain.setTargetAtTime(0.0001, when + Math.max(dur * 0.92, 0.08), 0.09);
    src.connect(g); g.connect(this.master);
    src.start(when);
    src.stop(when + Math.max(dur * 1.6, 0.45));
    this.track(src, when, into);
  }

  /** Network-independent, pitched fallback used only until a nearby piano sample arrives. */
  private synthNote(m: number, when: number, dur: number, vel: number, into?: Scheduled) {
    if (!this.ctx || !this.master) return;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const end = when + Math.max(0.22, Math.min(dur * 1.8, 0.8));
    oscillator.type = "triangle";
    oscillator.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, vel * 0.2), when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(when);
    oscillator.stop(end + 0.02);
    this.fallbackNotes++;
    this.track(oscillator, when, into);
  }

  private track(source: AudioScheduledSourceNode, when = 0, into?: Scheduled) {
    this.live.add(source);
    into?.set(source, when);
    source.onended = () => {
      this.live.delete(source);
      into?.delete(source);
    };
  }

  /** Silence everything in `nodes` that was due to start at or after `at`.
   *  Sources that already began keep ringing, so the seam is legato, not a cut. */
  private cancelFrom(nodes: Scheduled, at: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [node, when] of nodes) {
      if (when < at - 1e-4) continue;
      try { node.stop(now); } catch {}
      try { node.disconnect(); } catch {}
      nodes.delete(node);
      this.live.delete(node);
    }
  }

  /** One-shot chord/note preview, for tapping a chip or a chord card. */
  async preview(midis: number[], spread = 0.055, velocity = 0.7): Promise<boolean> {
    const request = ++this.previewId;
    await this.init("/audio/salamander", midis);
    if (request !== this.previewId || !this.ctx) return false;
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.85, now, 0.008);
    }
    const t0 = this.ctx.currentTime + 0.02;
    midis.forEach((m, i) => this.note(m, t0 + i * spread, 1.1, velocity));
    return true;
  }

  /** A short chord progression, one chord per `gap` seconds, scheduled on the
   *  audio clock rather than with timers so a busy main thread cannot smear it.
   *  Tracked like every other source, so Stop and route changes still cut it. */
  async previewChords(chords: number[][], gap = 0.9, velocity = 0.62): Promise<boolean> {
    const request = ++this.previewId;
    await this.init("/audio/salamander", chords.flat());
    if (request !== this.previewId || !this.ctx) return false;
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.85, now, 0.008);
    }
    const t0 = this.ctx.currentTime + 0.03;
    chords.forEach((c, i) =>
      c.forEach((m, j) => this.note(m, t0 + i * gap + j * 0.012, gap * 0.95, velocity)));
    return true;
  }

  private clickAt(when: number, strong: boolean, into?: Scheduled) {
    if (!this.ctx || !this.clickBus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = strong ? 1500 : 900;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(strong ? 0.5 : 0.24, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);
    o.connect(g); g.connect(this.clickBus);
    o.start(when); o.stop(when + 0.05);
    this.track(o, when, into);
  }

  /** One click per count-in beat, the first one strong. Heard whether or not
   *  the running click is on: a count-in you cannot hear is only a silence. */
  private countIn(t0: number, beats: number, beatDur: number) {
    for (let i = 0; i < beats; i++) this.clickAt(t0 + i * beatDur, i === 0);
  }

  /* ── the drill ──────────────────────────────────────────────────────── */

  async start(opts: PlaybackOptions): Promise<boolean> {
    const request = ++this.requestId;
    // Two players never sound together: a drill replaces a running vamp too.
    this.stopVamp(true);
    this.stopPlayback(true);

    const first = compileDrill(opts);
    await this.init("/audio/salamander", first.steps.flatMap((s) => s ?? []));
    if (request !== this.requestId || !this.ctx || !first.steps.length) return false;

    // stopPlayback deliberately faded the previous run. Restore before the
    // count-in; unlike the old timeout, this does not depend on playing=false.
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0.85, now);
    }

    this.opts = opts;
    this.playing = true;
    this.queued = 0;
    this.upcomingSteps = [];
    const countIn = opts.countInBeats * opts.beatDur;
    const t0 = this.ctx.currentTime + 0.3;
    this.drill = new LiveTimeline(drillGrid, sameDrillMaterial, first, t0 + countIn);
    this.lastOrigin = this.drill.origin;
    // The count-in always sounds. With the click off it used to be a silent
    // wait of a whole bar after Play, which reads as "Play is broken".
    this.countIn(t0, opts.countInBeats, opts.beatDur);
    this.pump();
    this.timer = setInterval(() => this.pump(), TICK_MS);
    return true;
  }

  /**
   * Change a running drill without stopping it. Tempo, click, swing and loop
   * land on the next beat and carry on in place; new notes, grouping, meter or
   * subdivision land on the next bar and start from their own bar 1.
   * Returns false when nothing is playing (the caller simply starts instead).
   */
  update(plan: DrillPlan): boolean {
    if (!this.playing || !this.drill || !this.ctx) return false;
    const next = compileDrill(plan);
    if (!next.steps.length) return false;
    if (sameDrillPlan(this.drill.latest.plan, next)) {
      this.drill.relabel(next);
      return true;
    }
    const { at } = this.drill.change(next, this.ctx.currentTime, SEAM_LEAD);
    this.cancelFrom(this.drillNodes, at);
    const kept = this.upcomingSteps.filter((w) => w < at - 1e-4);
    this.queued -= this.upcomingSteps.length - kept.length;
    this.upcomingSteps = kept;
    this.pump();
    return true;
  }

  private playStep(s: Step<CompiledDrill>) {
    const { src, steps } = s.seg.plan;
    // Shuffle: the offbeat 8th lands a triplet late. Feel only — the grid,
    // the click and the engraving stay straight, which is how swing is written.
    const shift = src.swing && src.subdivision === 2 && s.pos % 2 === 1 ? src.stepDur / 3 : 0;
    const stack = steps[s.index];
    const accent = src.accents ? !!src.accents[s.index] : s.pos % src.grouping === 0;
    if (stack)
      stack.forEach((m, j) =>
        this.note(m, s.when + shift + j * (src.spread ?? 0), src.stepDur,
                  accent ? 0.95 : 0.7, this.drillNodes));
    if (src.click && s.pos % src.subdivision === 0)
      this.clickAt(s.when, s.pos % (src.subdivision * (src.beatsPerBar ?? 4)) === 0, this.drillNodes);
  }

  private pump() {
    if (!this.playing || !this.drill || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.drill.prune(now);
    this.upcomingSteps = this.upcomingSteps.filter((w) => w >= now);
    for (const s of this.drill.take(now + LOOKAHEAD)) {
      this.playStep(s);
      this.queued++;
      this.upcomingSteps.push(s.when);
    }
    if (now > this.drill.endTime() + 0.15) this.stop();
  }

  /** Where the drill is right now, from the audio clock. Null before the first note. */
  position(): DrillPosition | null {
    if (!this.ctx || !this.drill || !this.playing) return null;
    const at = this.drill.locate(this.ctx.currentTime);
    if (!at) return null;
    const { seg } = at;
    return {
      index: at.index, bar: at.bar, bars: at.bars, beat: at.beat, beats: at.beats,
      pending: at.pending, next: at.next, plan: seg.plan.src,
      segment: { id: seg.id, start: seg.start, firstPos: seg.firstPos, stepDur: seg.grid.stepDur },
      rev: at.rev,
    };
  }

  /** Current step index, derived from the clock — safe against dropped frames. */
  currentIndex(): number {
    return this.position()?.index ?? -1;
  }

  /** Beats until the drill starts — drives the count-in display. */
  countdown(): number {
    const o = this.opts;
    if (!this.ctx || !o || !this.playing || !this.drill) return 0;
    const left = this.drill.origin - this.ctx.currentTime;
    return left > 0 ? Math.ceil(left / o.beatDur) : 0;
  }

  /* ── the vamp ───────────────────────────────────────────────────────── */

  /** Start a looping vamp. Independent of the drill scheduler so the two can
   *  never corrupt each other's queue state. */
  async startVamp(opts: VampOptions): Promise<boolean> {
    const request = ++this.requestId;
    this.stopVamp(true);
    this.stopPlayback(true);

    const priority = opts.chords.flatMap((c) => [c.bass, ...c.voicing]);
    await this.init("/audio/salamander", priority);
    if (request !== this.requestId || !this.ctx || !opts.chords.length) return false;

    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0.85, now);
    }

    this.vampOpts = opts;
    this.vamping = true;
    const countIn = opts.countInBeats * opts.beatDur;
    const t0 = this.ctx.currentTime + 0.3;
    this.vamp = new LiveTimeline(vampGrid, sameVampMaterial, compileVamp(opts), t0 + countIn);
    this.countIn(t0, opts.countInBeats, opts.beatDur);

    this.pumpVamp();
    this.vampTimer = setInterval(() => this.pumpVamp(), TICK_MS);
    return true;
  }

  /** Change a running vamp without stopping it — same rules as `update()`:
   *  tempo, click, bass and chords on/off on the next beat; a new progression,
   *  key, voicing or feel on the next bar, from its first chord. */
  updateVamp(plan: VampPlan): boolean {
    if (!this.vamping || !this.vamp || !this.ctx || !plan.chords.length) return false;
    const next = compileVamp(plan);
    if (sameVampPlan(this.vamp.latest.plan, next)) {
      this.vamp.relabel(next);
      return true;
    }
    const { at } = this.vamp.change(next, this.ctx.currentTime, SEAM_LEAD);
    this.cancelFrom(this.vampNodes, at);
    this.pumpVamp();
    return true;
  }

  /** One beat of the vamp: the comp and bass hits that fall inside it, and the click. */
  private playBeat(s: Step<CompiledVamp>) {
    const { src: o, barChord } = s.seg.plan;
    const beat = s.index % o.beatsPerBar;
    const chord = o.chords[barChord[Math.floor(s.index / o.beatsPerBar)] ?? 0];
    const pattern = COMP[o.feel] ?? COMP.straight;
    const swing = o.feel === "swing";
    const at = (b: number) => {
      // push the offbeats late for a swing feel
      const frac = b % 1;
      const shift = swing && Math.abs(frac - 0.5) < 0.01 ? 0.167 : 0;
      return s.when + (frac + shift) * o.beatDur;
    };

    if (o.compOn)
      for (const [i, b] of pattern.chord.entries())
        if (Math.floor(b) === beat)
          for (const m of chord.voicing)
            this.note(m, at(b), o.beatDur * 1.6, i === 0 ? 0.34 : 0.22, this.vampNodes);

    if (o.bassOn)
      for (const [i, b] of pattern.bass.entries())
        if (Math.floor(b) === beat) {
          const m = i === 0 ? chord.bass
                            : chord.bass + [0, 7, 12, 7][i % 4]; // root/fifth movement
          this.note(m, at(b), o.beatDur * 0.9, 0.42, this.vampNodes);
        }

    if (o.click) this.clickAt(s.when, beat === 0, this.vampNodes);
  }

  private pumpVamp() {
    if (!this.vamping || !this.vamp || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.vamp.prune(now);
    for (const s of this.vamp.take(now + LOOKAHEAD)) this.playBeat(s);
  }

  /** Where the vamp is right now. Null during the count-in. */
  vampPosition(): VampPosition | null {
    if (!this.ctx || !this.vamp || !this.vamping) return null;
    const at = this.vamp.locate(this.ctx.currentTime);
    if (!at) return null;
    const { src, barChord } = at.seg.plan;
    return {
      chordIndex: barChord[at.bar - 1] ?? 0,
      bar: at.bar, bars: at.bars, beat: at.beat, beats: at.beats,
      pending: at.pending, next: at.next, plan: src, rev: at.rev,
    };
  }

  /** Which chord index is sounding right now, for lighting the UI. */
  currentChordIndex(): number {
    return this.vampPosition()?.chordIndex ?? -1;
  }

  vampCountdown(): number {
    const o = this.vampOpts;
    if (!this.ctx || !o || !this.vamping || !this.vamp) return 0;
    const left = this.vamp.origin - this.ctx.currentTime;
    return left > 0 ? Math.ceil(left / o.beatDur) : 0;
  }

  stopVamp(silent = false) {
    this.vamping = false;
    this.vampOpts = null;
    this.vamp = null;
    if (this.vampTimer) { clearInterval(this.vampTimer); this.vampTimer = null; }
    if (!silent) this.stopPlayback(true);
  }

  stop(silent = false) {
    this.requestId++;
    this.stopPlayback(silent);
  }

  private stopPlayback(silent: boolean) {
    const onStop = this.opts?.onStop;
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.opts = null;
    this.drill = null;
    this.upcomingSteps = [];
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.master) {
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(0, now + 0.012);
        this.master.gain.setValueAtTime(0.85, now + 0.04);
      }
      for (const source of this.live) {
        try { source.stop(now + 0.015); } catch {}
      }
      this.live.clear();
    }
    this.drillNodes.clear();
    this.vampNodes.clear();
    if (!silent) onStop?.();
  }
}

let singleton: AudioEngine | null = null;
export const getAudio = (): AudioEngine => (singleton ??= new AudioEngine());

/** Fire-and-forget UI preview with no unhandled rejection in click handlers. */
export async function previewAudio(
  midis: number[], spread = 0.055, velocity = 0.7,
): Promise<boolean> {
  try {
    return await getAudio().preview(midis, spread, velocity);
  } catch {
    return false;
  }
}

/** Fire-and-forget chord-sequence preview. */
export async function previewChords(chords: number[][], gap = 0.9): Promise<boolean> {
  try {
    return await getAudio().previewChords(chords, gap);
  } catch {
    return false;
  }
}
