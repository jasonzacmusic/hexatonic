/**
 * Audio engine — real Salamander grand piano samples.
 *
 * Two rules learned the hard way in the prototype:
 *
 * 1. Audio correctness must NOT depend on requestAnimationFrame. rAF is throttled
 *    hard when the tab loses focus, which silently broke looping — the drill ran
 *    hundreds of notes past its loop point and never re-scheduled. A setInterval
 *    LOOKAHEAD SCHEDULER owns the audio; rAF only paints the highlight.
 * 2. Everything is scheduled against AudioContext.currentTime, never setTimeout.
 */

import { midi, Note } from "../theory/note";

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

export interface PlaybackOptions {
  /** spelled notes; MIDI is derived only at the audio boundary. null = a rest —
   *  the pulse advances, the click still sounds, nothing is struck. */
  notes: (Note | null)[];
  stepDur: number;          // seconds per note
  grouping: number;         // accent every N
  subdivision: number;      // notes per beat (for the click)
  beatsPerBar?: number;
  /** shuffle: with 8th subdivisions, offbeats land a triplet late (2:1) */
  swing?: boolean;
  loop: boolean;
  click: boolean;
  countInBeats: number;
  beatDur: number;
  onStop?: () => void;
}

const LOOKAHEAD = 3.0;
const TICK_MS = 400;

export interface VampChord {
  bass: number;
  voicing: number[];
  bars: number;
}

export interface VampOptions {
  chords: VampChord[];
  beatDur: number;
  beatsPerBar: number;
  feel: "straight" | "swing" | "68";
  click: boolean;
  countInBeats: number;
  bassOn: boolean;
  compOn: boolean;
}

/** Comp patterns, in beats from the top of the bar.
 *  Kept deliberately sparse — this is a bed to improvise over, not a performance
 *  competing with the student. */
const COMP: Record<string, { chord: number[]; bass: number[] }> = {
  straight: { chord: [0, 1.5, 2.5], bass: [0, 2] },
  swing:    { chord: [1, 3],        bass: [0, 1, 2, 3] },
  "68":     { chord: [0, 1, 2],     bass: [0, 1.5] },
};

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
  private queued = 0;
  private seqStart = 0;
  private requestId = 0;
  private previewId = 0;
  private live = new Set<AudioScheduledSourceNode>();
  private fallbackNotes = 0;

  ready = false;
  playing = false;
  vamping = false;
  private vampOpts: VampOptions | null = null;
  private vampTimer: ReturnType<typeof setInterval> | null = null;
  private vampBar = 0;
  private vampStart = 0;

  get context() { return this.ctx; }
  get startTime() { return this.seqStart; }
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

  note(m: number, when: number, dur: number, vel = 0.8) {
    if (!this.ctx || !this.master) return;
    const nearest = this.nearest(m);
    const buf = nearest && nearest.distance <= 12 ? this.buffers.get(nearest.key) : null;
    if (!buf || !nearest) {
      this.synthNote(m, when, dur, vel);
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
    this.track(src);
  }

  /** Network-independent, pitched fallback used only until a nearby piano sample arrives. */
  private synthNote(m: number, when: number, dur: number, vel: number) {
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
    this.track(oscillator);
  }

  private track(source: AudioScheduledSourceNode) {
    this.live.add(source);
    source.onended = () => this.live.delete(source);
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

  private clickAt(when: number, strong: boolean) {
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
    this.track(o);
  }

  async start(opts: PlaybackOptions): Promise<boolean> {
    const request = ++this.requestId;
    this.stopPlayback(true);

    await this.init("/audio/salamander",
      opts.notes.filter((n): n is Note => n !== null).map(midi));
    if (request !== this.requestId) return false;
    if (request !== this.requestId || !this.ctx || !opts.notes.length) return false;

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
    const countIn = opts.countInBeats * opts.beatDur;
    this.seqStart = this.ctx.currentTime + 0.3 + countIn;
    if (opts.click) {
      for (let i = 0; i < opts.countInBeats; i++)
        this.clickAt(this.ctx.currentTime + 0.3 + i * opts.beatDur, i === 0);
    }
    this.pump();
    this.timer = setInterval(() => this.pump(), TICK_MS);
    return true;
  }

  private pump() {
    const o = this.opts;
    if (!this.playing || !o || !this.ctx) return;
    const len = o.notes.length;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    let guard = 0;
    while (this.seqStart + this.queued * o.stepDur < horizon && guard++ < 20000) {
      const i = this.queued;
      if (!o.loop && i >= len) break;
      // Shuffle: the offbeat 8th lands a triplet late. Feel only — the grid,
      // the click and the engraving stay straight, which is how swing is written.
      const shift =
        o.swing && o.subdivision === 2 && i % 2 === 1 ? o.stepDur / 3 : 0;
      const when = this.seqStart + i * o.stepDur + shift;
      const n = o.notes[i % len];
      if (n) this.note(midi(n), when, o.stepDur, i % o.grouping === 0 ? 0.95 : 0.7);
      if (o.click && i % o.subdivision === 0)
        this.clickAt(this.seqStart + i * o.stepDur, i % (o.subdivision * (o.beatsPerBar ?? 4)) === 0);
      this.queued++;
    }
    if (!o.loop && this.ctx.currentTime > this.seqStart + len * o.stepDur + 0.15) {
      this.stop();
    }
  }

  /** Current step index, derived from the clock — safe against dropped frames. */
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
    this.vampBar = 0;
    const countIn = opts.countInBeats * opts.beatDur;
    this.vampStart = this.ctx.currentTime + 0.3 + countIn;
    if (opts.click)
      for (let i = 0; i < opts.countInBeats; i++)
        this.clickAt(this.ctx.currentTime + 0.3 + i * opts.beatDur, i === 0);

    this.pumpVamp();
    this.vampTimer = setInterval(() => this.pumpVamp(), TICK_MS);
    return true;
  }

  private pumpVamp() {
    const o = this.vampOpts;
    if (!this.vamping || !o || !this.ctx) return;
    const barDur = o.beatDur * o.beatsPerBar;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    const pattern = COMP[o.feel] ?? COMP.straight;
    const totalBars = o.chords.reduce((a, c) => a + c.bars, 0);
    let guard = 0;

    while (this.vampStart + this.vampBar * barDur < horizon && guard++ < 2000) {
      const barAt = this.vampStart + this.vampBar * barDur;
      // which chord is this bar in?
      let acc = 0, chord = o.chords[0];
      const barInCycle = this.vampBar % totalBars;
      for (const c of o.chords) {
        if (barInCycle < acc + c.bars) { chord = c; break; }
        acc += c.bars;
      }
      const swing = o.feel === "swing";
      const at = (beat: number) => {
        // push the offbeats late for a swing feel
        const frac = beat % 1;
        const shift = swing && Math.abs(frac - 0.5) < 0.01 ? 0.167 : 0;
        return barAt + (Math.floor(beat) + frac + shift) * o.beatDur;
      };

      if (o.compOn)
        for (const [i, b] of pattern.chord.entries())
          for (const m of chord.voicing)
            this.note(m, at(b), o.beatDur * 1.6, i === 0 ? 0.34 : 0.22);

      if (o.bassOn)
        for (const [i, b] of pattern.bass.entries()) {
          const m = i === 0 ? chord.bass
                            : chord.bass + [0, 7, 12, 7][i % 4]; // root/fifth movement
          this.note(m, at(b), o.beatDur * 0.9, 0.42);
        }

      if (o.click)
        for (let b = 0; b < o.beatsPerBar; b++)
          this.clickAt(barAt + b * o.beatDur, b === 0);

      this.vampBar++;
    }
  }

  /** Which chord index is sounding right now, for lighting the UI. */
  currentChordIndex(): number {
    const o = this.vampOpts;
    if (!this.ctx || !o || !this.vamping) return -1;
    const barDur = o.beatDur * o.beatsPerBar;
    const elapsed = this.ctx.currentTime - this.vampStart;
    if (elapsed < 0) return -1;
    const totalBars = o.chords.reduce((a, c) => a + c.bars, 0);
    const barInCycle = Math.floor(elapsed / barDur) % totalBars;
    let acc = 0;
    for (let i = 0; i < o.chords.length; i++) {
      if (barInCycle < acc + o.chords[i].bars) return i;
      acc += o.chords[i].bars;
    }
    return 0;
  }

  vampCountdown(): number {
    const o = this.vampOpts;
    if (!this.ctx || !o || !this.vamping) return 0;
    const left = this.vampStart - this.ctx.currentTime;
    return left > 0 ? Math.ceil(left / o.beatDur) : 0;
  }

  stopVamp(silent = false) {
    this.vamping = false;
    this.vampOpts = null;
    if (this.vampTimer) { clearInterval(this.vampTimer); this.vampTimer = null; }
    if (!silent) this.stopPlayback(true);
  }

  currentIndex(): number {
    const o = this.opts;
    if (!this.ctx || !o || !this.playing) return -1;
    const i = Math.floor((this.ctx.currentTime - this.seqStart) / o.stepDur);
    if (i < 0) return -1;
    return o.loop ? i % o.notes.length : Math.min(i, o.notes.length - 1);
  }

  /** Beats until the drill starts — drives the count-in display. */
  countdown(): number {
    const o = this.opts;
    if (!this.ctx || !o || !this.playing) return 0;
    const left = this.seqStart - this.ctx.currentTime;
    return left > 0 ? Math.ceil(left / o.beatDur) : 0;
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
