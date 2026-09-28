"use client";

/**
 * THE HEXATONIC SHAPE: the app's signature picture of a scale.
 *
 * A chromatic clock. The tonic sits at 12 o'clock and each step clockwise is
 * one semitone, so the picture is the same in every key: only the letters
 * change. The six notes you have are joined into a six-sided shape; the note
 * that was taken out is a hollow dashed RED seat in the gap it left; the other
 * chromatic tones are dim marks. The note sounding right now is GOLD, and
 * nothing else on the ring is.
 *
 *   <ScaleRing notes={scale.notes} removed={scale.removed} activePc={pc|null} size="md" />
 *
 * Sizes: "sm" (112px, shape only, for cards), "md" (220px), "lg" (340px), or
 * any number of pixels. It shrinks to fit a narrower parent (max-width:100%).
 * Labels are on for md and lg and off for sm; they never drop below 13px at
 * the nominal size.
 *
 * When the notes change (a different scale is picked) the shape MORPHS: each
 * corner glides to its new position in ~320ms, and a new change mid-glide
 * starts from wherever the corners are. Changing only the key does not move
 * the shape, because the shape does not depend on the key. Reduced motion
 * snaps instead.
 *
 * Children are drawn in the centre of the ring (a caption, a name).
 */

import { Note, pc, notePretty } from "@/lib/theory/note";
import { augTriangles, fifthsSlot } from "@/lib/theory/board";
import { useSplashes } from "@/lib/splash";
import SplashMark from "@/components/SplashMark";
import { ReactNode, useEffect, useId, useRef, useState } from "react";

/** Chromatic: one semitone per step. Fifths: one perfect fifth per step. */
export type RingLayout = "chromatic" | "fifths";

/** The four augmented triangles' own colours (C E G♯, G B D♯, D F♯ A♯, A C♯ E♯).
 *  None is gold, red, the root green or a pair colour. */
export const TRIANGLE_INK = ["#E0894F", "#D9BF8C", "#D97BC0", "#62B0E0"] as const;
/** Triad A of a pair is circled (blue), triad B is pointed at (violet): the
 *  same two colours as the pair keyboard. Green stays the root's alone. */
export const PAIR_INK = { a: "#8DBDEB", b: "#BBA6F7" } as const;

export const RING_SIZES = { sm: 112, md: 220, lg: 340 } as const;
export type RingSize = keyof typeof RING_SIZES;

export interface ScaleRingProps {
  notes: Note[];
  removed: Note | null;
  /** Pitch class (0–11) of the note sounding now, or null. */
  activePc?: number | null;
  size?: RingSize | number;
  /** Note names round the ring. Default: on for md/lg, off for sm. */
  showLabels?: boolean;
  /** A slow decorative sweep round the ring. */
  spin?: boolean;
  /** Glide between shapes when the notes change. Default true. */
  morph?: boolean;
  className?: string;
  /** Drawn in the centre of the ring. */
  children?: ReactNode;
  /** Chromatic clock (default) or the circle of fifths. Changing it glides. */
  layout?: RingLayout;
  /** On the circle of fifths, draw the four augmented triangles (the star)
   *  and light the ones inside this scale. */
  augStar?: boolean;
  /** The board marks for a triad pair: pitch classes of triad A (circled)
   *  and triad B (pointed at with an arrow). */
  marks?: { a: number[]; b: number[] } | null;
  /** Splash a played note that is outside the scale. */
  splash?: boolean;
}

/** Everything is drawn in a 200-unit box and scaled. */
const V = 200;
const C = V / 2;
const MORPH_MS = 320;

const round = (v: number) => Math.round(v * 100) / 100;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const relOf = (p: number, root: number) => (((p - root) % 12) + 12) % 12;

const GOLD = "#C9A227";
const GOLD_HI = "#F3D765";
const RED = "#C4353C";
const RED_TEXT = "#F08A8F";
const DOT = "#CFC6BA";
/** The root: home. The Tonic green from Harmony. */
const ROOT = "#79C2A5";

/** Where each note of the scale sits, in semitones clockwise from the tonic. */
export function ringPositions(notes: Note[]): number[] {
  if (!notes.length) return [];
  const root = pc(notes[0]);
  return notes.map((n) => relOf(pc(n), root));
}

export function ScaleRing({
  notes, removed, activePc = null, size = "md",
  showLabels, spin = false, morph = true, className = "", children,
  layout = "chromatic", augStar = false, marks = null, splash = false,
}: ScaleRingProps) {
  const uid = useId().replace(/:/g, "");
  const px = typeof size === "number" ? size : RING_SIZES[size];
  const labels = showLabels ?? px >= 160;

  /* Label type is 13.5px at the nominal size or 5% of the ring, whichever is
     bigger, and the ring pulls in to make room for it. */
  const font = Math.min(18, Math.max(V * 0.05, (13.5 * V) / px));
  const R = labels ? V / 2 - font * 1.9 - 4 : V * 0.4;
  const unit = V / Math.max(px, 1); // viewBox units per CSS pixel
  const dotR = Math.max(V * 0.03, 3.2 * unit);

  const rootPc = notes.length ? pc(notes[0]) : 0;
  const slotOf = (rel: number) => (layout === "fifths" ? fifthsSlot(rel) : rel);
  const target = ringPositions(notes).map(slotOf);
  const targetKey = target.join(",");

  /* ── the morph ────────────────────────────────────────────────────── */
  const [drawn, setDrawn] = useState<number[]>(target);
  const [moving, setMoving] = useState(false);
  const shown = useRef<number[]>(target);
  const raf = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const from = shown.current;
    const to = targetKey ? targetKey.split(",").map(Number) : [];
    const reduce = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const same = from.length === to.length && from.every((v, i) => Math.abs(((v - to[i]) % 12 + 12) % 12) < 1e-3);
    if (same) { shown.current = to; setDrawn(to); setMoving(false); return; }
    if (!morph || reduce || from.length !== to.length) {
      shown.current = to; setDrawn(to); setMoving(false); return;
    }
    const t0 = performance.now();
    setMoving(true);
    /* each corner goes the short way round the circle */
    const delta = to.map((v, i) => { let d = (((v - from[i]) % 12) + 12) % 12; if (d > 6) d -= 12; return d; });
    const span = MORPH_MS * (Math.max(...delta.map(Math.abs)) > 3 ? 1.6 : 1);
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / span);
      const k = ease(t);
      const cur = t < 1 ? from.map((v, i) => v + delta[i] * k) : to;
      shown.current = cur;
      setDrawn(cur);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setMoving(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [targetKey, morph]);

  // If the parent swaps note arrays of a different length mid-render, fall back.
  const rels = drawn.length === notes.length ? drawn : target;

  const at = (rel: number, r = R) => {
    const a = (rel / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: round(C + r * Math.cos(a)), y: round(C + r * Math.sin(a)) };
  };
  const labelAt = (rel: number) => {
    const p = at(rel, R + dotR + font * 0.95);
    return { x: p.x, y: round(p.y + font * 0.36) };
  };

  const scalePcs = notes.map(pc);
  const removedPc = removed ? pc(removed) : -1;
  /* joined round the circle, so on the circle of fifths the shape is the
     arc of fifths the scale covers, not a tangle */
  const m12 = (v: number) => ((v % 12) + 12) % 12;
  const poly = [...rels].sort((a, b) => m12(a) - m12(b)).map((r) => at(r)).map(({ x, y }) => `${x},${y}`).join(" ");
  const splashes = useSplashes(splash, scalePcs, removedPc);
  const tris = layout === "fifths" && augStar && notes.length ? augTriangles(notes) : [];
  const markSet = marks ? { a: new Set(marks.a), b: new Set(marks.b) } : null;

  /* the two notes either side of the gap, going clockwise */
  const gap = (() => {
    if (removedPc < 0 || !notes.length) return null;
    const g = slotOf(relOf(removedPc, rootPc));
    const sorted = [...target].sort((a, b) => a - b);
    const before = [...sorted].reverse().find((r) => r < g) ?? sorted[sorted.length - 1];
    const after = sorted.find((r) => r > g) ?? sorted[0];
    return { g, A: at(before), B: at(after), P: at(g), L: labelAt(g) };
  })();

  const name = `${notes.map(notePretty).join(" ")}${removed ? `, with ${notePretty(removed)} taken out` : ""}`;

  return (
    <div className={`relative inline-block max-w-full shrink-0 align-middle ${className}`}
         style={{ width: px }}>
      <svg viewBox={`0 0 ${V} ${V}`} width="100%" className="block h-auto w-full overflow-visible"
           role="img" aria-label={`Scale shape: ${name}`}>
        <defs>
          <radialGradient id={`fill${uid}`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#F4EFE4" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#F4EFE4" stopOpacity="0.025" />
          </radialGradient>
          <linearGradient id={`edge${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F4EFE4" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#F4EFE4" stopOpacity="0.22" />
          </linearGradient>
          <filter id={`soft${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={V * 0.022} />
          </filter>
        </defs>

        {/* the clock face */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#2A2523" strokeWidth={Math.max(1, unit)} />
        {spin && (
          <circle cx={C} cy={C} r={R + dotR * 2.2} fill="none"
                  stroke="#F4EFE4" strokeOpacity={0.12} strokeWidth={Math.max(1, unit)}
                  strokeDasharray={`${R * 0.5} ${R * 2.4}`} strokeLinecap="round"
                  className="hx-spin" style={{ transformOrigin: `${C}px ${C}px` }} />
        )}

        {/* the chromatic tones this scale does not use */}
        {Array.from({ length: 12 }, (_, i) => i)
          .filter((r) => !target.includes(r) && !(gap && r === gap.g))
          .map((r) => {
            const { x, y } = at(r);
            return <circle key={`o${r}`} cx={x} cy={y} r={Math.max(V * 0.009, 1.4 * unit)} fill="#4A4240" />;
          })}

        {/* the six-sided shape */}
        {rels.length > 2 && (
          <polygon points={poly} fill={`url(#fill${uid})`}
                   stroke={`url(#edge${uid})`} strokeWidth={Math.max(1.5, 1.6 * unit)}
                   strokeLinejoin="round" opacity={tris.length ? 0.55 : 1} />
        )}

        {/* THE STAR: four augmented triads, each an equilateral triangle on the
            circle of fifths. The ones inside the scale are drawn strong, one
            after another; the rest stay faint so the whole star still shows. */}
        {!moving && tris.map((t, k) => {
          const pts = t.pcs.map((p) => at(slotOf(relOf(p, rootPc)), R));
          const order = tris.filter((x) => x.inScale).indexOf(t);
          return (
            <polygon key={`${targetKey}-${t.index}`} pathLength={1}
                     points={pts.map(({ x, y }) => `${x},${y}`).join(" ")}
                     fill={TRIANGLE_INK[t.index]} fillOpacity={t.inScale ? 0.1 : 0}
                     stroke={TRIANGLE_INK[t.index]} strokeOpacity={t.inScale ? 0.95 : 0.28}
                     strokeWidth={Math.max(1, (t.inScale ? 1.7 : 1) * unit)} strokeLinejoin="round"
                     className="hx-draw"
                     style={{ animationDelay: `${(t.inScale ? order : 2 + k) * 150}ms` }}>
              <title>{`${t.name}: an augmented triad${t.inScale ? ", inside this scale" : ""}`}</title>
            </polygon>
          );
        })}

        {/* THE BOARD MARKS for a triad pair: triad A circled, triad B pointed at */}
        {markSet && !moving && notes.map((n, i) => {
          const p = pc(n);
          const rel = rels[i] ?? 0;
          const deg = (rel / 12) * 360 - 90;
          if (markSet.a.has(p)) {
            const span = labels ? dotR + font * 0.95 : 0;
            const c = at(rel, R + span * 0.5);
            const rx = span * 0.5 + (labels ? font * 0.95 : dotR * 2);
            const ry = labels ? font * 0.92 : dotR * 2;
            return (
              <g key={`oa${i}`} className="hx-mark" style={{ animationDelay: `${i * 40}ms` }}>
                {/* the rotation sits on the ellipse, the CSS entrance on the group:
                    a CSS transform would override the SVG one */}
                <ellipse cx={c.x} cy={c.y} rx={rx} ry={ry}
                         transform={`rotate(${round(deg)} ${c.x} ${c.y})`}
                         fill={PAIR_INK.a} fillOpacity={0.14} stroke={PAIR_INK.a} strokeOpacity={0.85}
                         strokeWidth={Math.max(1, 1.3 * unit)} />
              </g>
            );
          }
          if (markSet.b.has(p)) {
            const tip = at(rel, R - dotR * 1.9);
            const tail = at(rel, R - dotR * 5.4);
            const a = (rel / 12) * Math.PI * 2 - Math.PI / 2;
            const h = dotR * 1.05;
            const l = { x: round(tip.x - h * Math.cos(a) + h * 0.8 * Math.cos(a + Math.PI / 2)), y: round(tip.y - h * Math.sin(a) + h * 0.8 * Math.sin(a + Math.PI / 2)) };
            const r2 = { x: round(tip.x - h * Math.cos(a) - h * 0.8 * Math.cos(a + Math.PI / 2)), y: round(tip.y - h * Math.sin(a) - h * 0.8 * Math.sin(a + Math.PI / 2)) };
            return (
              <g key={`ab${i}`} className="hx-mark" style={{ animationDelay: `${i * 40}ms` }}
                 stroke={PAIR_INK.b} strokeWidth={Math.max(1.2, 1.5 * unit)} strokeLinecap="round" fill="none">
                <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} />
                <polyline points={`${l.x},${l.y} ${tip.x},${tip.y} ${r2.x},${r2.y}`} strokeLinejoin="round" />
              </g>
            );
          }
          return null;
        })}

        {/* THE NOTE THAT WAS TAKEN OUT: the route the scale does not take, and
            the empty seat it would have used. Hidden while the shape glides, so
            it never sits on the wrong spot. */}
        {gap && (
          <g style={{ opacity: moving ? 0 : 1, transition: moving ? "none" : "opacity 180ms ease-out" }}>
            <polyline points={`${gap.A.x},${gap.A.y} ${gap.P.x},${gap.P.y} ${gap.B.x},${gap.B.y}`}
                      fill="none" stroke={RED} strokeOpacity={0.55}
                      strokeWidth={Math.max(V * 0.007, 1.2 * unit)}
                      strokeDasharray={`${V * 0.02} ${V * 0.02}`}
                      strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={gap.P.x} cy={gap.P.y} r={dotR} fill="#0A0908"
                    stroke={RED} strokeWidth={Math.max(V * 0.01, 1.6 * unit)}
                    strokeDasharray={`${dotR * 0.72} ${dotR * 0.45}`} />
            {labels && (
              <text x={gap.L.x} y={gap.L.y} textAnchor="middle" className="font-mono"
                    fill={RED_TEXT} style={{ fontSize: font, fontWeight: 600 }}>
                {notePretty(removed!)}
              </text>
            )}
          </g>
        )}

        {/* the notes you have */}
        {notes.map((n, i) => {
          const rel = rels[i] ?? 0;
          const { x, y } = at(rel);
          const on = activePc !== null && pc(n) === activePc;
          const L = labelAt(rel);
          return (
            <g key={i}>
              {on && <circle cx={x} cy={y} r={dotR * 2.6} fill={GOLD} opacity={0.45} filter={`url(#soft${uid})`} />}
              {/* the root is green and wears an outer ring: this is home
                  (the same green as "Tonic" on Harmony) */}
              {i === 0 && (
                <circle cx={x} cy={y} r={dotR + Math.max(V * 0.018, 3 * unit)} fill="none"
                        stroke={on ? GOLD_HI : ROOT} strokeOpacity={0.95}
                        strokeWidth={Math.max(V * 0.008, 1.8 * unit)} />
              )}
              <circle cx={x} cy={y} r={on ? dotR * 1.38 : dotR} fill={on ? GOLD_HI : i === 0 ? ROOT : DOT}
                      style={{ transition: on ? "none" : "r 60ms ease-out, fill 60ms ease-out" }} />
              {labels && (
                <text x={L.x} y={L.y} textAnchor="middle" className="font-mono"
                      fill={on ? GOLD_HI : i === 0 ? ROOT : DOT}
                      style={{ fontSize: font, fontWeight: on || i === 0 ? 700 : 500,
                               transition: on ? "none" : "fill 60ms ease-out" }}>
                  {notePretty(n)}
                </text>
              )}
            </g>
          );
        })}
        {splashes.map((sp) => {
          const P = at(slotOf(relOf(sp.pc, rootPc)));
          return <SplashMark key={sp.id} x={P.x} y={P.y} r={dotR * 2.3} kind={sp.kind} />;
        })}
      </svg>
      {children && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

export default ScaleRing;
