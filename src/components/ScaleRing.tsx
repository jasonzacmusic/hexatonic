"use client";

/**
 * The signature visual: a chromatic clock.
 *
 * Twelve positions. The six notes you have are filled and joined into a polygon;
 * the note that was removed is a hollow red ring sitting in the gap it left; the
 * remaining chromatic tones are dim marks. It shows the shape of the scale and
 * the shape of the absence at the same time, which is the whole idea of the app.
 */

import { Note, pc, notePretty } from "@/lib/theory/note";
import { useId } from "react";

interface Props {
  notes: Note[];
  removed: Note | null;
  activePc?: number | null;
  size?: number;
  showLabels?: boolean;
  spin?: boolean;
  className?: string;
}

export default function ScaleRing({
  notes, removed, activePc = null, size = 280,
  showLabels = true, spin = false, className = "",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.33;
  const rootPc = notes.length ? pc(notes[0]) : 0;

  // 12 o'clock is the tonic; clockwise by semitone.
  const posFor = (p: number) => {
    const rel = ((p - rootPc) % 12 + 12) % 12;
    const a = (rel / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a };
  };
  /* Labels sit radially OUTWARD from each dot. Placing them all "above" made them
     collide at the bottom of the circle where the dots crowd together. */
  const labelFor = (p: number, pad: number) => {
    const rel = ((p - rootPc) % 12 + 12) % 12;
    const a = (rel / 12) * Math.PI * 2 - Math.PI / 2;
    const LR = R + pad;
    return { x: cx + LR * Math.cos(a), y: cy + LR * Math.sin(a) + size * 0.018 };
  };

  const scalePcs = notes.map(pc);
  const removedPc = removed ? pc(removed) : -1;
  const poly = scalePcs
    .map((p) => posFor(p))
    .map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`Chromatic ring showing ${notes.map(notePretty).join(" ")}${
        removed ? `, with ${notePretty(removed)} removed` : ""
      }`}
    >
      <defs>
        <radialGradient id={`glow${uid}`}>
          <stop offset="0%" stopColor="#C9A227" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#C9A227" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`edge${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9A227" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0.18" />
        </linearGradient>
        <filter id={`soft${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={size * 0.018} />
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={R * 1.5} fill={`url(#glow${uid})`} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2A2523" strokeWidth={1} />

      {/* decorative sweep — the labels must NEVER rotate or they end up upside down */}
      {spin && (
        <circle
          cx={cx} cy={cy} r={R * 1.22} fill="none"
          stroke="#C9A227" strokeOpacity={0.16} strokeWidth={1}
          strokeDasharray={`${R * 0.5} ${R * 2.4}`} strokeLinecap="round"
          className="hx-spin" style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      <g>
        {/* the shape of the scale */}
        {poly && (
          <polygon
            points={poly}
            fill="#C9A227" fillOpacity={0.07}
            stroke={`url(#edge${uid})`} strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* the ten chromatic marks we are not using */}
        {Array.from({ length: 12 }, (_, i) => (rootPc + i) % 12)
          .filter((p) => !scalePcs.includes(p) && p !== removedPc)
          .map((p) => {
            const { x, y } = posFor(p);
            return <circle key={`o${p}`} cx={x} cy={y} r={size * 0.008} fill="#3A3331" />;
          })}

        {/* the note that was removed — a hollow ring in the gap it left */}
        {removedPc >= 0 && (() => {
          const { x, y } = posFor(removedPc);
          const r = size * 0.032;
          return (
            <g key="rm">
              <circle cx={x} cy={y} r={r} fill="none" stroke="#E8666C" strokeWidth={size * 0.011} />
              <line x1={x - r * 0.72} y1={y - r * 0.72} x2={x + r * 0.72} y2={y + r * 0.72}
                    stroke="#E8666C" strokeWidth={size * 0.009} strokeLinecap="round" />
              {showLabels && (() => {
                const L = labelFor(removedPc, size * 0.088);
                return (
                  <text x={L.x} y={L.y} textAnchor="middle"
                        className="fill-[#E8666C] font-mono"
                        style={{ fontSize: size * 0.05, fontWeight: 600 }}>
                    {notePretty(removed!)}
                  </text>
                );
              })()}
            </g>
          );
        })()}

        {/* the six notes we have */}
        {notes.map((n, i) => {
          const p = pc(n);
          const { x, y } = posFor(p);
          const on = activePc !== null && p === activePc;
          const r = size * (on ? 0.042 : 0.03);
          return (
            <g key={i}>
              {on && (
                <circle cx={x} cy={y} r={size * 0.075} fill="#C9A227" opacity={0.4}
                        filter={`url(#soft${uid})`} />
              )}
              <circle cx={x} cy={y} r={r} fill={on ? "#F3D765" : "#C9A227"}
                      style={{ transition: "r 90ms linear, fill 90ms linear" }} />
              {showLabels && (() => {
                const L = labelFor(p, size * 0.088);
                return (
                  <text x={L.x} y={L.y} textAnchor="middle" className="font-mono"
                        fill={on ? "#F3D765" : "#9A9088"}
                        style={{ fontSize: size * 0.05, fontWeight: on ? 700 : 500,
                                 transition: "fill 90ms linear" }}>
                    {notePretty(n)}
                  </text>
                );
              })()}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
