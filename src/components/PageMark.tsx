import type { ReactElement } from "react";

/**
 * Each section's emblem, drawn in the class-board language: ovals, arrows,
 * arcs, the dashed red seat of a removed note. Decorative only (aria-hidden),
 * fixed size so it never moves the page, and it draws itself in once; with
 * reduced motion it is simply there.
 *
 * Musical content is real: Harmony shows G (G B D) circled and Am (A C E)
 * arrowed on the clock, the pair that makes the G Sunday Scale.
 */

const INK = {
  line: "#2A2523", faint: "#4A4240", cream: "#F4EFE4", muted: "#A79E94",
  blue: "#8DBDEB", green: "#79CFAC", red: "#E8666C", gold: "#F3D765", water: "#7CC6EA", copper: "#E0894F",
};

export type MarkKind = "harmony" | "ear" | "learn" | "resolution" | "improvise";

const C = 80;
const R = 58;
const at = (semi: number, r = R) => {
  const a = (semi / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: +(C + r * Math.cos(a)).toFixed(2), y: +(C + r * Math.sin(a)).toFixed(2) };
};
const pts = (ss: number[]) => ss.map((s) => at(s)).map((p) => `${p.x},${p.y}`).join(" ");

function Harmony() {
  const A = [0, 4, 7];   // G B D, from G at the top
  const B = [2, 5, 9];   // A C E
  const name: Record<number, string> = { 0: "G", 2: "A", 4: "B", 5: "C", 7: "D", 9: "E" };
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <circle cx={C} cy={C} r={R} fill="none" stroke={INK.line} strokeWidth="1.2" />
      {Array.from({ length: 12 }, (_, i) => i).filter((i) => !(i in name)).map((i) => {
        const p = at(i); return <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={INK.faint} />;
      })}
      <polygon points={pts(A)} pathLength={1} fill={INK.blue} fillOpacity="0.08" stroke={INK.blue} strokeWidth="1.6" strokeLinejoin="round" className="hx-draw" />
      <polygon points={pts(B)} pathLength={1} fill={INK.green} fillOpacity="0.08" stroke={INK.green} strokeWidth="1.6" strokeLinejoin="round" className="hx-draw" style={{ animationDelay: "180ms" }} />
      {A.map((s, i) => {
        const p = at(s, R + 12);
        const deg = (s / 12) * 360 - 90;
        return (
          <g key={s} className="hx-mark" style={{ animationDelay: `${380 + i * 60}ms` }}>
            <ellipse cx={p.x} cy={p.y} rx="15" ry="10" transform={`rotate(${deg} ${p.x} ${p.y})`}
                     fill={INK.blue} fillOpacity="0.14" stroke={INK.blue} strokeWidth="1.3" />
          </g>
        );
      })}
      {B.map((s, i) => {
        const tip = at(s, R - 6), tail = at(s, R - 22);
        const a = (s / 12) * Math.PI * 2 - Math.PI / 2;
        const h = 5;
        const l = { x: tip.x - h * Math.cos(a) + h * 0.8 * Math.cos(a + Math.PI / 2), y: tip.y - h * Math.sin(a) + h * 0.8 * Math.sin(a + Math.PI / 2) };
        const r = { x: tip.x - h * Math.cos(a) - h * 0.8 * Math.cos(a + Math.PI / 2), y: tip.y - h * Math.sin(a) - h * 0.8 * Math.sin(a + Math.PI / 2) };
        return (
          <g key={s} stroke={INK.green} strokeWidth="1.6" strokeLinecap="round" fill="none" className="hx-mark" style={{ animationDelay: `${520 + i * 60}ms` }}>
            <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} />
            <polyline points={`${l.x},${l.y} ${tip.x},${tip.y} ${r.x},${r.y}`} strokeLinejoin="round" />
          </g>
        );
      })}
      {Object.entries(name).map(([s, n]) => {
        const p = at(+s, R + 12);
        return <text key={s} x={p.x} y={p.y + 4.2} textAnchor="middle" fontFamily="var(--font-plex-mono)" fontSize="12" fontWeight="700"
                     fill={A.includes(+s) ? INK.blue : INK.green}>{n}</text>;
      })}
    </svg>
  );
}

function Ear() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      {[18, 34, 50, 66].map((r, i) => (
        <circle key={r} cx="70" cy="84" r={r} fill="none" stroke={INK.water} strokeOpacity={0.75 - i * 0.16}
                strokeWidth="1.4" pathLength={1} className="hx-draw" style={{ animationDelay: `${i * 110}ms` }} />
      ))}
      <circle cx="70" cy="84" r="6" fill={INK.gold} className="hx-mark" />
      <circle cx="128" cy="34" r="11" fill="none" stroke={INK.red} strokeWidth="1.6" strokeDasharray="4 3" className="hx-mark" style={{ animationDelay: "420ms" }} />
      <path d="M 112 50 Q 104 60 96 64" fill="none" stroke={INK.red} strokeOpacity="0.6" strokeWidth="1.3" strokeDasharray="3 3" strokeLinecap="round" className="hx-fade" style={{ animationDelay: "520ms" }} />
    </svg>
  );
}

function Learn() {
  const row = ["G", "A", "B", "C", "D", "E", "F♯"];
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%">
      {row.map((n, i) => {
        const x = 16 + i * 28;
        return n === "C" ? (
          <g key={n} className="hx-mark" style={{ animationDelay: "300ms" }}>
            <circle cx={x} cy="46" r="11" fill="none" stroke={INK.red} strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={x} y="51" textAnchor="middle" fontFamily="var(--font-archivo)" fontSize="13" fontWeight="700" fill={INK.red}>C</text>
          </g>
        ) : (
          <text key={n} x={x} y="53" textAnchor="middle" fontFamily="var(--font-archivo)" fontSize="19" fontWeight="800"
                fill={INK.cream} className="hx-fade" style={{ animationDelay: `${i * 50}ms` }}>{n}</text>
        );
      })}
      <text x="100" y="104" textAnchor="middle" fontFamily="var(--font-archivo)" fontSize="30" fontWeight="900" letterSpacing="-0.5" fill={INK.cream}>
        7<tspan fill={INK.red} dx="4">−</tspan><tspan dx="4">1</tspan><tspan fill={INK.muted} dx="4">=</tspan><tspan dx="4">6</tspan>
      </text>
    </svg>
  );
}

function Resolution() {
  /* groups of three against 4/4: the accent comes back to beat 1 after 3 bars */
  const beats = 12;
  return (
    <svg viewBox="0 0 220 110" width="100%" height="100%">
      {[0, 1, 2, 3].map((b) => (
        <line key={b} x1={14 + b * 64} y1="30" x2={14 + b * 64} y2="80" stroke={INK.muted} strokeOpacity="0.6" strokeWidth="1.4" />
      ))}
      {Array.from({ length: beats }, (_, i) => {
        const x = 14 + Math.floor(i / 4) * 64 + 10 + (i % 4) * 14;
        const accent = i % 3 === 0;
        return (
          <g key={i} className="hx-fade" style={{ animationDelay: `${i * 40}ms` }}>
            <circle cx={x} cy="62" r={accent ? 4.2 : 2.6} fill={accent ? INK.cream : INK.faint} />
            {accent && <path d={`M ${x - 4} 44 L ${x + 3} 47 L ${x - 4} 50`} fill="none" stroke={INK.copper} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        );
      })}
      <line x1="206" y1="30" x2="206" y2="80" stroke={INK.muted} strokeOpacity="0.6" strokeWidth="1.4" />
      <path d="M 24 94 C 90 108, 150 108, 204 90" fill="none" stroke={INK.gold} strokeWidth="1.6" strokeLinecap="round" pathLength={1} className="hx-draw" style={{ animationDelay: "420ms" }} />
      <circle cx="214" cy="62" r="5" fill={INK.gold} className="hx-mark" style={{ animationDelay: "800ms" }} />
    </svg>
  );
}

function Improvise() {
  const ys = [70, 52, 60, 38, 48, 30, 44];
  return (
    <svg viewBox="0 0 200 110" width="100%" height="100%">
      <path d={`M 14 ${ys[0]} ` + ys.slice(1).map((y, i) => {
        const x0 = 14 + i * 28, x1 = 14 + (i + 1) * 28;
        return `C ${x0 + 14} ${ys[i]}, ${x1 - 14} ${y}, ${x1} ${y}`;
      }).join(" ")} fill="none" stroke={INK.cream} strokeOpacity="0.55" strokeWidth="1.5" pathLength={1} className="hx-draw" />
      {ys.map((y, i) => (
        <circle key={i} cx={14 + i * 28} cy={y} r={i === 5 ? 6 : 3.4} fill={i === 5 ? INK.gold : INK.cream}
                className="hx-mark" style={{ animationDelay: `${200 + i * 50}ms` }} />
      ))}
      <g className="hx-mark" style={{ animationDelay: "600ms" }}>
        <ellipse cx={14 + 5 * 28} cy="30" rx="13" ry="17" transform={`rotate(-10 ${14 + 5 * 28} 30)`} fill="none" stroke={INK.blue} strokeWidth="1.4" />
      </g>
      <g stroke={INK.green} strokeWidth="1.6" strokeLinecap="round" fill="none" className="hx-mark" style={{ animationDelay: "700ms" }}>
        <line x1={14 + 5 * 28} y1="98" x2={14 + 5 * 28} y2="58" />
        <polyline points={`${14 + 5 * 28 - 5},64 ${14 + 5 * 28},57 ${14 + 5 * 28 + 5},64`} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const MARKS: Record<MarkKind, { el: () => ReactElement; w: number; h: number }> = {
  harmony: { el: Harmony, w: 120, h: 120 },
  ear: { el: Ear, w: 168, h: 168 },
  learn: { el: Learn, w: 220, h: 132 },
  resolution: { el: Resolution, w: 240, h: 120 },
  improvise: { el: Improvise, w: 220, h: 121 },
};

export default function PageMark({ kind, className = "" }: { kind: MarkKind; className?: string }) {
  const m = MARKS[kind];
  const El = m.el;
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute right-0 top-2 ${className}`} style={{ width: m.w, height: m.h }}>
      <El />
    </div>
  );
}
