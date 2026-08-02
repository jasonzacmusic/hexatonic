"use client";

/**
 * The standalone calculator. Useful to any musician on any scale, which is why it
 * earns links on its own — and why it is the app's way in.
 */

import { useMemo, useState } from "react";
import { solveResolution, isLocked, GATIS, YATIS, SUBDIVISIONS } from "@/lib/theory/resolution";
import Link from "next/link";

const SIZES = [
  { n: 5, label: "5 — Audava / pentatonic" },
  { n: 6, label: "6 — Shadava / hexatonic" },
  { n: 7, label: "7 — Sampurna / heptatonic" },
  { n: 8, label: "8 — octatonic" },
];

export default function ResolutionClient() {
  const [size, setSize] = useState(6);
  const [octaves, setOctaves] = useState(1);
  const [includeTop, setIncludeTop] = useState(false);
  const [beats, setBeats] = useState(4);
  const [mode, setMode] = useState<"accent" | "full">("full");
  const [bpm, setBpm] = useState(84);

  const patternLen = size * octaves + (includeTop ? 1 : 0);
  const groupings = [3, 4, 5, 6, 7, 9];

  const rows = useMemo(
    () =>
      SUBDIVISIONS.map((s) => ({
        sub: s,
        cells: groupings.map((g) => {
          const r = solveResolution(patternLen, s.value, beats, g, mode);
          return {
            g, bars: r.bars, notes: r.totalNotes,
            locked: isLocked(s.value, beats, g),
            secs: (r.totalNotes * (60 / bpm)) / s.value,
          };
        }),
      })),
    [patternLen, beats, mode, bpm]
  );

  const best = useMemo(
    () => rows.flatMap((r) => r.cells.map((c) => ({ ...c, sub: r.sub })))
             .filter((c) => Number.isInteger(c.bars))
             .sort((a, b) => a.bars - b.bars || a.g - b.g)
             .slice(0, 8),
    [rows]
  );

  const tone = (bars: number) =>
    bars <= 4 ? "text-gold" : "text-amber";

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-3xl pt-2">
        <h1 className="text-3xl font-extrabold">Resolution calculator</h1>
        <p className="lede mt-3">
          How many bars until a scale pattern lands back on the downbeat with the accent?
          Two clocks are phasing against each other — the bar, and the pattern — and this
          is the least common multiple of them.
        </p>
        <p className="mt-3 text-sm text-muted">
          It works for any scale size, so it is just as useful on the major scale or a
          pentatonic. Six-note scales simply happen to win.
        </p>
      </header>

      <section className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field min-w-[220px]">
            <label htmlFor="sz">Notes in the scale</label>
            <select id="sz" className="sel w-full" value={size}
                    onChange={(e) => setSize(Number(e.target.value))}>
              {SIZES.map((s) => <option key={s.n} value={s.n}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="oc">Octaves</label>
            <select id="oc" className="sel" value={octaves}
                    onChange={(e) => setOctaves(Number(e.target.value))}>
              {[1, 2, 3].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tp">Top note</label>
            <button id="tp" className="btn btn-ghost" data-on={includeTop}
                    onClick={() => setIncludeTop((v) => !v)}>
              {includeTop ? "included" : "excluded"} · {patternLen} notes
            </button>
          </div>
          <div className="field">
            <label htmlFor="bt">Beats per bar</label>
            <select id="bt" className="sel" value={beats}
                    onChange={(e) => setBeats(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="md">Resolve</label>
            <select id="md" className="sel" value={mode}
                    onChange={(e) => setMode(e.target.value as any)}>
              <option value="full">full — tonic + accent + downbeat</option>
              <option value="accent">accent — accent returns to beat 1</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bp">Tempo <span className="text-gold">{bpm}</span></label>
            <input id="bp" type="range" min={40} max={200} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))}
                   className="w-36 accent-[#C9A227]" />
          </div>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[12px] uppercase tracking-[0.1em] text-muted">
              <th className="py-2 pr-4">subdivision</th>
              {groupings.map((g) => (
                <th key={g} className="py-2 pr-4">
                  {g}s{GATIS[g]?.name ? <span className="block normal-case text-[12px] text-muted/70">{GATIS[g].name}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sub.value} className="border-b border-line/60">
                <td className="py-2.5 pr-4 font-mono">{r.sub.label}</td>
                {r.cells.map((c) => (
                  <td key={c.g} className="py-2.5 pr-4">
                    <span className={`font-bold tabular-nums ${tone(c.bars)}`}>{c.bars}</span>
                    <span className="ml-1 text-[12px] text-muted">bar{c.bars === 1 ? "" : "s"}</span>
                    <span className="block font-mono text-[12px] text-muted">
                      {c.notes} notes · {c.secs.toFixed(0)}s
                      {c.locked ? " · locked" : ""}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 max-w-[68ch] text-sm text-muted">
          <span className="text-gold">Gold</span> resolves inside four bars and is
          camera-friendly. <span className="text-amber">Amber</span> is usable but long.
          Red will lose a room. &ldquo;Locked&rdquo; means the accent already returns on
          the very next downbeat — only 5 and 7 genuinely fight a 4/4 bar.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
          Shortest combinations for this setting
        </h2>
        <div className="flex flex-wrap gap-2">
          {best.map((b, i) => (
            <div key={i} className="chip text-left">
              <span className="block text-sm font-semibold">{b.bars} bar{b.bars === 1 ? "" : "s"}</span>
              <span className="block font-mono text-[12px] text-muted">
                {b.sub.label} · {b.g}s · {b.notes} notes
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-[68ch] text-sm text-muted">
          The practical lesson for teaching: odd groupings want triplet subdivisions.
          Fives in straight sixteenths takes {solveResolution(6, 4, 4, 5, "full").bars} bars;
          the same fives in eighth-note triplets takes {solveResolution(6, 3, 4, 5, "full").bars}.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-extrabold">The groupings have names</h2>
        <p className="mt-2 max-w-[68ch] text-muted">
          Counting in 3s, 4s, 5s, 7s and 9s is the Carnatic <em>gati</em> system, and
          &ldquo;resolving on the one&rdquo; is landing on <em>samam</em>. The vocabulary
          is older than the idea of practising scales this way.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[3, 4, 5, 7, 9].map((n) => {
            const g = GATIS[n];
            return (
              <div key={n} className="well rounded-lg px-3 py-2">
                <p className="text-sm font-semibold">
                  {g.name} <span className="font-normal text-muted">· {n}</span>
                </p>
                <p className="font-mono text-[12px] text-gold">{g.konnakol}</p>
                {g.etymology && <p className="mt-0.5 text-[12px] text-muted">{g.etymology}</p>}
              </div>
            );
          })}
        </div>
        <h3 className="mt-6 text-sm font-semibold">And the ladders have names too</h3>
        <p className="mt-1 max-w-[68ch] text-sm text-muted">
          Running 3 → 4 → 5 → 6 → 7 is <strong className="text-cream">srotovaha yati</strong>,
          the image being a river widening from its source. Its mirror is{" "}
          <strong className="text-cream">gopuccha</strong> — a cow&rsquo;s tail, tapering.
          There are six of these, not five.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {YATIS.map((y) => (
            <div key={y.id} className="well rounded-lg px-3 py-2">
              <p className="text-sm font-semibold">{y.name}</p>
              <p className="font-mono text-[12px] text-gold">{y.shape.join(" – ")}</p>
              <p className="text-[12px] text-muted">{y.image}</p>
            </div>
          ))}
        </div>
      </section>

      <p><Link href="/practice" className="btn btn-primary">Try one of these on the practice screen</Link></p>
    </div>
  );
}
