"use client";

/**
 * A scale written the way Jason writes it on the class board, set in type:
 *
 *   · triad A's notes circled in soft ovals, triad B's notes arrowed from
 *     below (board pages 1–3);
 *   · intervals floating above: from the tonic (M2, P4, m7 …, page 3), or,
 *     for the augmented scale, the step between neighbours (page 6);
 *   · for the whole-tone scale, arcs over the major thirds (page 4);
 *   · the removed note in its gap, a dashed red seat.
 *
 * Every label is computed from the notes as spelled (src/lib/theory/board.ts),
 * so a step the spelling calls m3 is never labelled aug2.
 */

import { Note, notePretty, pc } from "@/lib/theory/note";
import { BoardStyle, boardStyle, fromTonic, majorThirdArcs, steps } from "@/lib/theory/board";
import { PAIR_INK } from "@/components/ScaleRing";

const ROOT = "#79C2A5";
const RED = "#E8666C";
const GOLD_HI = "#F3D765";

const mod12 = (v: number) => ((v % 12) + 12) % 12;

export default function BoardRow({
  notes, removed = null, ovals = [], arrows = [], added = [], activePc = null, style, className = "", label,
}: {
  notes: Note[];
  removed?: Note | null;
  /** pitch classes of triad A, circled */
  ovals?: number[];
  /** pitch classes of triad B, arrowed */
  arrows?: number[];
  activePc?: number | null;
  /** notes added to a smaller scale, marked with a plus */
  added?: number[];
  /** which interval picture ("plain": none); worked out from the notes when left out */
  style?: BoardStyle | "plain";
  className?: string;
  /** read aloud instead of the note list */
  label?: string;
}) {
  if (!notes.length) return null;
  const pick = style ?? boardStyle(notes);
  const tonicPc = pc(notes[0]);

  /* the row: the six notes in order, with the removed note in its gap */
  type Cell = { n: Note; i: number | null };
  const cells: Cell[] = notes.map((n, i) => ({ n, i }));
  if (removed) {
    const g = mod12(pc(removed) - tonicPc);
    const at = cells.findIndex((c) => mod12(pc(c.n) - tonicPc) > g);
    cells.splice(at < 0 ? cells.length : at, 0, { n: removed, i: null });
  }

  const SLOT = 62;
  const PAD = 26;
  const W = PAD * 2 + SLOT * (cells.length - 1);
  const topRoom = pick === "thirds" ? 64 : pick === "plain" ? 26 : 40;
  const NY = topRoom + 40; // baseline of the letters
  const H = NY + (arrows.length ? 58 : 22);
  const xOf = (k: number) => PAD + SLOT * k;
  const xNote = (i: number) => xOf(cells.findIndex((c) => c.i === i));

  const deg = fromTonic(notes);
  const st = steps(notes);
  const arcs = pick === "thirds" ? majorThirdArcs(notes) : [];
  const A = new Set(ovals);
  const B = new Set(arrows);

  const aria = label ?? `${notes.map(notePretty).join(" ")}${removed ? `, ${notePretty(removed)} left out` : ""}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`block h-auto w-full ${className}`} role="img" aria-label={aria}
         style={{ maxWidth: W * 1.25 }}>
      {/* the intervals */}
      {pick === "degrees" && notes.map((n, i) => i > 0 && (
        <text key={`d${i}`} x={xNote(i)} y={NY - 44} textAnchor="middle" className="font-mono"
              fill="#62B0E0" style={{ fontSize: 13, fontWeight: 600 }}>
          {deg[i]}
        </text>
      ))}
      {pick === "steps" && st.map((s) => {
        const x = (xNote(s.from) + xNote(s.to)) / 2;
        const wide = s.semis === 3;
        return (
          <text key={`s${s.from}`} x={x} y={NY - 40} textAnchor="middle" className="font-mono"
                fill={wide ? "#E0894F" : "#A79E94"} style={{ fontSize: 13, fontWeight: wide ? 700 : 500 }}>
            {s.name}
          </text>
        );
      })}
      {arcs.map((a, k) => {
        const x1 = xNote(a.from), x2 = xNote(a.to);
        const lift = a.from % 2 ? 50 : 34;
        const y = NY - 34;
        return (
          <g key={`a${k}`} className="hx-fade" style={{ animationDelay: `${120 + k * 90}ms` }}>
            <path d={`M ${x1} ${y} C ${x1} ${y - lift}, ${x2} ${y - lift}, ${x2} ${y}`} fill="none"
                  stroke="#E0894F" strokeOpacity={0.85} strokeWidth={1.6} strokeLinecap="round" />
            <text x={(x1 + x2) / 2} y={y - lift * 0.75 - 4} textAnchor="middle" className="font-mono"
                  fill="#E0894F" style={{ fontSize: 12, fontWeight: 700 }} paintOrder="stroke"
                  stroke="#14120F" strokeWidth={4}>M3</text>
          </g>
        );
      })}

      {cells.map((c, k) => {
        const x = xOf(k);
        if (c.i === null) {
          return (
            <g key={`r${k}`}>
              <circle cx={x} cy={NY - 10} r={19} fill="none" stroke={RED} strokeWidth={1.6}
                      strokeDasharray="4 3.5" />
              <text x={x} y={NY - 3} textAnchor="middle" className="font-sans" fill={RED}
                    style={{ fontSize: 19, fontWeight: 700 }}>{notePretty(c.n)}</text>
            </g>
          );
        }
        const p = pc(c.n);
        const on = activePc !== null && p === activePc;
        return (
          <g key={`n${k}`}>
            {A.has(p) && (
              <g className="hx-mark" style={{ animationDelay: `${k * 45}ms` }}>
                <ellipse cx={x} cy={NY - 12} rx={22} ry={29} transform={`rotate(-10 ${x} ${NY - 12})`}
                         fill={PAIR_INK.a} fillOpacity={0.15} stroke={PAIR_INK.a} strokeOpacity={0.9} strokeWidth={1.6} />
              </g>
            )}
            {B.has(p) && (
              <g stroke={PAIR_INK.b} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"
                 className="hx-mark" style={{ animationDelay: `${k * 45 + 60}ms` }}>
                <line x1={x} y1={NY + 42} x2={x} y2={NY + 20} />
                <polyline points={`${x - 5.5},${NY + 26} ${x},${NY + 19} ${x + 5.5},${NY + 26}`} />
              </g>
            )}
            <text x={x} y={NY} textAnchor="middle" className="font-sans"
                  fill={on ? GOLD_HI : "#F4EFE4"} style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {notePretty(c.n)}
            </text>
            {added.includes(p) && (
              <g className="hx-mark" stroke="#E0894F" strokeWidth={2.2} strokeLinecap="round">
                <line x1={x + 17} y1={NY - 36} x2={x + 17} y2={NY - 24} />
                <line x1={x + 11} y1={NY - 30} x2={x + 23} y2={NY - 30} />
              </g>
            )}
            {c.i === 0 && <rect x={x - 11} y={NY + 7} width={22} height={3.5} rx={1.75} fill={ROOT}><title>Root: home</title></rect>}
          </g>
        );
      })}
    </svg>
  );
}
