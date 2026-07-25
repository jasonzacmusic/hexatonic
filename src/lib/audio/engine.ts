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
  notes: Note[];            // spelled notes; MIDI is derived only at the audio boundary
  stepDur: number;          // seconds per note
  grouping: number;         // accent every N
  subdivision: number;      // notes per beat (for the click)
  beatsPerBar?: number;
  loop: boolean;
  click: boolean;
  countInBeats: number;
  beatDur: number;
  onStop?: () => void;
}

const LOOKAHEAD = 3.0;
const TICK_MS = 400;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private clickBus: GainNode | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private initPromise: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private opts: PlaybackOptions | null = null;
  private queued = 0;
  private seqStart = 0;
  private requestId = 0;
  private live = new Set<AudioScheduledSourceNode>();

  loading = false;
  ready = false;
  playing = false;

  get context() { return this.ctx; }
  get startTime() { return this.seqStart; }
  get loadedSamples() { return this.buffers.size; }
  get totalSamples() { return Object.keys(SAMPLES).length; }
  get liveNodeCount() { return this.live.size; }

  async init(basePath = "/audio/salamander"): Promise<void> {
    if (this.ready) {
      await this.resume();
      return;
    }
    if (this.initPromise) return this.initPromise;

    this.loading = true;
    this.initPromise = (async () => {
      if (!this.ctx) {
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

      // Call resume before the first await so iOS can associate it with the
      // user's Play gesture. A rejected resume can still succeed on a later tap.
      const resume = this.ctx.state === "suspended"
        ? this.ctx.resume().catch(() => undefined)
        : Promise.resolve();

      const loaded = new Map<number, AudioBuffer>();
      await Promise.all(
        Object.entries(SAMPLES).map(async ([m, name]) => {
          const res = await fetch(`${basePath}/${name}.mp3`);
          if (!res.ok) throw new Error(`sample ${name} failed (${res.status})`);
          const buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
          loaded.set(Number(m), buf);
        })
      );
      await resume;
      this.buffers = loaded;
      this.ready = true;
    })();

    try {
      await this.initPromise;
    } catch (error) {
      this.ready = false;
      this.buffers.clear();
      throw error;
    } finally {
      this.loading = false;
      this.initPromise = null;
    }
  }

  /** Resume after a tab-visibility change — the AudioContext suspend trap. */
  async resume() {
    if (this.ctx?.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // Browsers may require a fresh user gesture. The next Play/preview tap
        // calls resume again while handling that gesture.
      }
    }
  }

  private nearest(m: number): number {
    let best = 60, bd = Infinity;
    for (const k of this.buffers.keys()) {
      const d = Math.abs(m - k);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  note(m: number, when: number, dur: number, vel = 0.8) {
    if (!this.ctx || !this.master) return;
    const s = this.nearest(m);
    const buf = this.buffers.get(s);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (m - s) / 12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + 0.006);
    g.gain.setTargetAtTime(0.0001, when + Math.max(dur * 0.92, 0.08), 0.09);
    src.connect(g); g.connect(this.master);
    src.start(when);
    src.stop(when + Math.max(dur * 1.6, 0.45));
    this.live.add(src);
    src.onended = () => this.live.delete(src);
  }

  /** One-shot chord/note preview, for tapping a chip or a chord card. */
  async preview(midis: number[], spread = 0.055) {
    await this.init();
    await this.resume();
    if (!this.ctx) return;
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.85, now, 0.008);
    }
    const t0 = this.ctx.currentTime + 0.02;
    midis.forEach((m, i) => this.note(m, t0 + i * spread, 1.1, 0.7));
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
    this.live.add(o);
    o.onended = () => this.live.delete(o);
  }

  async start(opts: PlaybackOptions): Promise<boolean> {
    const request = ++this.requestId;
    this.stopPlayback(true);

    await this.init();
    if (request !== this.requestId) return false;
    await this.resume();
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
      const when = this.seqStart + i * o.stepDur;
      this.note(midi(o.notes[i % len]), when, o.stepDur, i % o.grouping === 0 ? 0.95 : 0.7);
      if (o.click && i % o.subdivision === 0)
        this.clickAt(when, i % (o.subdivision * (o.beatsPerBar ?? 4)) === 0);
      this.queued++;
    }
    if (!o.loop && this.ctx.currentTime > this.seqStart + len * o.stepDur + 0.15) {
      this.stop();
    }
  }

  /** Current step index, derived from the clock — safe against dropped frames. */
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
