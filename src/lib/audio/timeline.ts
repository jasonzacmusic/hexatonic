/**
 * THE LIVE TIMELINE — why a running drill can change without stopping.
 *
 * The first scheduler baked one set of options at Play and walked it to the
 * end, so every screen had to stop and restart playback to change anything.
 * This timeline instead holds a list of SEGMENTS. Each segment is one set of
 * settings, starting at a known audio-clock time and a known position in the
 * music. A change never rewrites the past; it appends a segment that begins at
 * the next musically sensible boundary:
 *
 *   · same material, new tempo / click / swing / mix → the next BEAT, and the
 *     music carries on from where it was;
 *   · different material (key, scale, mode, pattern, grouping, meter,
 *     subdivision, chords) → the next BAR, and the new material starts from
 *     its own bar 1.
 *
 * The boundary is always a beat in both the old grid and the new one, so the
 * click never doubles or drops at the seam. The engine cancels whatever it had
 * already scheduled at or after the boundary; this module tells it where that is.
 *
 * Pure and clock-agnostic: no Web Audio in here, so it is tested directly.
 */

export interface Grid {
  /** seconds per step (one drill note, or one beat for a vamp) */
  stepDur: number;
  /** steps per beat — a tempo change lands on a multiple of this */
  beatSteps: number;
  /** steps per bar — any other change lands on a multiple of this */
  barSteps: number;
  /** steps in one pass of the material */
  length: number;
  loop: boolean;
}

export interface Segment<P> {
  id: number;
  /** audio-clock time of this segment's first step */
  start: number;
  /** position (in steps, counted from the material's start) of that first step */
  firstPos: number;
  plan: P;
  grid: Grid;
  /** true when this segment starts its material from the beginning */
  restart: boolean;
}

export interface Step<P> {
  /** position since the material (re)started — accents and clicks key off this */
  pos: number;
  /** position within one pass: which note/chord of the material */
  index: number;
  /** grid time of the step (swing is the caller's business) */
  when: number;
  seg: Segment<P>;
}

export interface Located<P> {
  seg: Segment<P>;
  pos: number;
  index: number;
  /** 1-based bar within the pass, and how many bars a pass has */
  bar: number;
  bars: number;
  /** 1-based beat within the bar, and how many beats a bar has */
  beat: number;
  beats: number;
  /** a change has been accepted and has not landed yet */
  pending: boolean;
  /** where that change lands: the next beat (same material) or the next bar (new material) */
  next: "beat" | "bar" | null;
  /** a non-looping pass has played its last step */
  ended: boolean;
  /** bumped by every change or relabel, so a UI knows its copy of the plan is stale */
  rev: number;
}

export interface Change<P> {
  /** audio-clock time the new settings take over; cancel anything scheduled at or after it */
  at: number;
  /** true when the new material starts from its own beginning */
  restart: boolean;
  seg: Segment<P>;
}

const EPS = 1e-6;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export class LiveTimeline<P> {
  private segs: Segment<P>[] = [];
  private cursor: Segment<P>;
  private k = 0;
  private ids = 1;
  private revision = 0;
  /** time the very first step sounds; the count-in ends here */
  readonly origin: number;

  constructor(
    private gridOf: (plan: P) => Grid,
    private sameMaterial: (a: P, b: P) => boolean,
    plan: P,
    start: number,
  ) {
    this.cursor = this.push(plan, start, 0, true);
    this.origin = start;
  }

  get segments(): readonly Segment<P>[] { return this.segs; }
  get latest(): Segment<P> { return this.segs[this.segs.length - 1]; }

  private push(plan: P, start: number, firstPos: number, restart: boolean): Segment<P> {
    const seg = { id: this.ids++, start, firstPos, plan, grid: this.gridOf(plan), restart };
    this.segs.push(seg);
    return seg;
  }

  private after(seg: Segment<P>): Segment<P> | undefined {
    return this.segs[this.segs.indexOf(seg) + 1];
  }

  /** Every step due before `until`, in time order. Advances the cursor. */
  take(until: number): Step<P>[] {
    const out: Step<P>[] = [];
    for (let guard = 0; guard < 100000; guard++) {
      const seg = this.cursor;
      const g = seg.grid;
      const pos = seg.firstPos + this.k;
      const when = seg.start + this.k * g.stepDur;
      const next = this.after(seg);
      const finished = !g.loop && pos >= g.length;
      if (next && (when >= next.start - EPS || finished)) {
        if (finished && next.start >= until) break;
        this.cursor = next;
        this.k = 0;
        continue;
      }
      if (finished || when >= until) break;
      out.push({ pos, index: g.loop ? mod(pos, g.length) : pos, when, seg });
      this.k++;
    }
    return out;
  }

  /**
   * Accept new settings at `now`. `lead` is the minimum time the engine needs
   * to schedule the seam; the boundary is the first one at or after now + lead.
   */
  change(plan: P, now: number, lead = 0.05): Change<P> {
    const cut = now + lead;
    // A change that has not landed yet is superseded: the newest request wins.
    while (this.segs.length > 1 && this.latest.start >= cut) this.segs.pop();
    const cur = this.latest;
    const restart = !this.sameMaterial(cur.plan, plan);

    let at: number;
    let pos: number;
    let fresh = restart;
    if (cur.start >= cut) {
      // Nothing of it has sounded yet (the count-in is still running):
      // replace it outright, on the same downbeat.
      this.segs.pop();
      at = cur.start;
      pos = restart ? 0 : cur.firstPos;
      fresh = restart || cur.restart;
    } else {
      const g = cur.grid;
      const unit = Math.max(1, restart ? g.barSteps : g.beatSteps);
      const k = Math.max(0, Math.ceil((cut - cur.start) / g.stepDur - EPS));
      let p = cur.firstPos + k;
      p += mod(unit - mod(p, unit), unit);
      at = cur.start + (p - cur.firstPos) * g.stepDur;
      pos = restart ? 0 : p;
    }

    const seg = this.push(plan, at, pos, fresh);
    this.revision++;
    // If the cursor already scheduled past the seam (or sat in a superseded
    // segment), rewind it to the seam; the engine cancels what lay beyond.
    const cursorAlive = this.segs.includes(this.cursor);
    const cursorAt = this.cursor.start + this.k * this.cursor.grid.stepDur;
    if (!cursorAlive || cursorAt >= at - EPS) {
      this.cursor = seg;
      this.k = 0;
    }
    return { at, restart, seg };
  }

  /** What is sounding at time t — drives the highlight and the beat counter. */
  locate(t: number): Located<P> | null {
    let seg: Segment<P> | null = null;
    for (const s of this.segs) {
      if (s.start <= t + EPS) seg = s;
      else break;
    }
    if (!seg) return null;
    const g = seg.grid;
    let pos = seg.firstPos + Math.floor((t - seg.start) / g.stepDur + EPS);
    const ended = !g.loop && pos >= g.length;
    if (ended) pos = Math.max(0, g.length - 1);
    const index = g.loop ? mod(pos, g.length) : pos;
    const pending = this.latest.start > t + EPS;
    const barSteps = Math.max(1, g.barSteps);
    const beatSteps = Math.max(1, g.beatSteps);
    return {
      seg, pos, index,
      bar: Math.floor(index / barSteps) + 1,
      bars: Math.max(1, Math.ceil(g.length / barSteps)),
      beat: Math.floor(mod(index, barSteps) / beatSteps) + 1,
      beats: Math.max(1, Math.round(barSteps / beatSteps)),
      pending,
      next: pending ? (this.latest.restart ? "bar" : "beat") : null,
      ended,
      rev: this.revision,
    };
  }

  /** When a non-looping pass finishes, or Infinity while it loops. */
  endTime(): number {
    const seg = this.latest;
    if (seg.grid.loop) return Infinity;
    return seg.start + Math.max(0, seg.grid.length - seg.firstPos) * seg.grid.stepDur;
  }

  /** Forget segments that finished well before `t`. */
  prune(t: number) {
    while (this.segs.length > 1 && this.segs[1].start < t - 1 && this.segs[0] !== this.cursor)
      this.segs.shift();
  }

  /** Swap in a plan with identical musical content, without a seam. */
  relabel(plan: P) {
    this.latest.plan = plan;
    this.revision++;
  }
}
