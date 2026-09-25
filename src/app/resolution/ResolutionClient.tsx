"use client";

/**
 * "Which bar does it land on?" A compact reference tool.
 *
 * Plain English first; the Carnatic names sit second and small. Every number on
 * the page comes from solveResolution (tests/theory.test.ts, tests/learn.test.ts).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { solveResolution, isLocked, GATIS, YATIS, SUBDIVISIONS } from "@/lib/theory/resolution";
import TihaiLab from "@/components/TihaiLab";

const SIZES = [
  { n: 5, label: "5 notes · pentatonic" },
  { n: 6, label: "6 notes · hexatonic" },
  { n: 7, label: "7 notes · major or minor" },
  { n: 8, label: "8 notes · octatonic" },
];
const GROUPINGS = [3, 4, 5, 6, 7, 9];
const SHORT = 4;             // "lands quickly": inside four bars

export default function ResolutionClient() {
  const [size, setSize] = useState(6);
  const [octaves, setOctaves] = useState(1);
  const [includeTop, setIncludeTop] = useState(false);
  const [beats, setBeats] = useState(4);
  const [mode, setMode] = useState<"accent" | "full">("full");
  const [bpm, setBpm] = useState(84);

  const patternLen = size * octaves + (includeTop ? 1 : 0);

  const rows = useMemo(
    () =>
      SUBDIVISIONS.map((s) => ({
        sub: s,
        cells: GROUPINGS.map((g) => {
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
             .sort((a, b) => a.bars - b.bars || a.g - b.g)
             .slice(0, 6),
    [rows]
  );

  const fives16 = solveResolution(patternLen, 4, beats, 5, mode).bars;
  const fives3 = solveResolution(patternLen, 3, beats, 5, mode).bars;

  return (
    <div className="space-y-6 pb-12">
      <header className="max-w-3xl pb-2 pt-2">
        <p className="eyebrow">Rhythm reference</p>
        <h1 className="display mt-3 text-[40px] sm:text-[56px]">Which bar does it land on?</h1>
        <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-cream/85">
          Play a scale in accented groups and the accent drifts across the bar line.
          Pick your settings to see how many bars pass before the scale&rsquo;s first
          note and the accent land together on beat 1.
        </p>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-cream/75">
          It works for any scale, five notes to eight.
        </p>
      </header>

      <section className="card" aria-label="Settings">
        <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-end">
          <div className="field col-span-2 sm:min-w-[230px]">
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
            <label htmlFor="bt">Beats in a bar</label>
            <select id="bt" className="sel" value={beats}
                    onChange={(e) => setBeats(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tp">Top note</label>
            <button id="tp" type="button" className="btn btn-ghost text-[15px]" aria-pressed={includeTop}
                    onClick={() => setIncludeTop((v) => !v)}>
              {includeTop ? "Played" : "Left out"} · {patternLen} notes
            </button>
          </div>
          <div className="field col-span-2 sm:col-span-1">
            <label htmlFor="md">Counts as landed when</label>
            <select id="md" className="sel" value={mode}
                    onChange={(e) => setMode(e.target.value as "accent" | "full")}>
              <option value="full">first note and accent are on beat 1</option>
              <option value="accent">the accent is on beat 1</option>
            </select>
          </div>
          <div className="field col-span-2 sm:col-span-1">
            <label htmlFor="bp">Tempo <span className="normal-case text-cream">{bpm} bpm</span></label>
            <input id="bp" type="range" min={40} max={200} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))}
                   className="w-full sm:w-40" />
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="bars-table">
        <h2 id="bars-table" className="display text-[22px] sm:text-[26px]">Bars to land</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-cream/75">
          Rows are how many notes you play in each beat. Columns are how often the accent comes.
        </p>
        <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] text-[15px]">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[13px] text-muted">
                <th scope="col" className="py-2 pr-4 font-normal">notes per beat</th>
                {GROUPINGS.map((g) => (
                  <th key={g} scope="col" className="py-2 pr-4 font-normal">
                    <span className="text-cream">groups of {g}</span>
                    {GATIS[g]?.name && (
                      <span className="block text-[13px] text-muted">{GATIS[g].name!.toLowerCase()}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sub.value} className="border-b border-line/60">
                  <th scope="row" className="py-2.5 pr-4 text-left font-mono text-[14px] font-normal text-cream">
                    {r.sub.label}
                  </th>
                  {r.cells.map((c) => (
                    <td key={c.g} className="py-2.5 pr-4 align-top">
                      <span className={`text-[17px] font-bold tabular-nums ${c.bars <= SHORT ? "text-cream" : "text-amber"}`}>
                        {c.bars}
                      </span>
                      <span className="ml-1 text-[13px] text-muted">bar{c.bars === 1 ? "" : "s"}</span>
                      <span className="block font-mono text-[13px] text-muted">
                        {c.notes} notes · {c.secs.toFixed(0)}s{c.locked ? " · locked" : ""}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-cream/75">
          <span className="text-amber">Amber</span> takes more than {SHORT} bars.
          &ldquo;Locked&rdquo; means the accent is back on beat 1 at the start of every bar.
          With these settings, groups of 5 take {fives16} bar{fives16 === 1 ? "" : "s"} in
          16ths and {fives3} in triplets.
        </p>
      </section>

      <section className="card" aria-labelledby="shortest">
        <h2 id="shortest" className="display text-[22px] sm:text-[26px]">Quickest to land</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {best.map((b, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface2 px-3.5 py-2">
              <span className="block text-[15px] font-semibold text-cream">
                {b.bars} bar{b.bars === 1 ? "" : "s"}
              </span>
              <span className="block font-mono text-[13px] text-muted">
                {b.sub.label} · groups of {b.g}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4">
          <Link href="/practice" className="btn btn-ghost text-[15px] text-cream">
            Try one on the practice screen →
          </Link>
        </p>
      </section>

      <TihaiLab />

      <details className="card group">
        <summary className="cursor-pointer list-none text-[17px] font-semibold text-cream [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block transition-transform duration-150 ease-out group-open:rotate-90" aria-hidden="true">›</span>
          Carnatic names for these counts
        </summary>
        <div className="mt-4 space-y-5">
          <p className="text-[15px] leading-relaxed text-cream/75">
            Carnatic music names each count: tisra (3), chatusra (4), khanda (5),
            misra (7) and sankeerna (9). Here they name phrases of that many notes,
            such as phrases of 5 (khanda). The same names also describe how many
            pulses fill one beat, which is called the gati. Beat 1 of the cycle is sam.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[3, 4, 5, 7, 9].map((n) => {
              const g = GATIS[n];
              return (
                <div key={n} className="well rounded-lg px-3 py-2.5">
                  <p className="text-[15px] font-semibold text-cream">
                    {n} · <span className="font-normal">{g.name}</span>
                  </p>
                  <p className="font-mono text-[13px] text-cream/80">{g.konnakol}</p>
                  {g.etymology && <p className="mt-0.5 text-[13px] text-muted">{g.etymology}</p>}
                </div>
              );
            })}
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-cream">Shapes of changing group sizes (yati)</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-cream/75">
              Growing 3 → 4 → 5 → 6 → 7 is srotovaha, a river widening from its source.
              Its mirror, shrinking, is gopuccha, a cow&rsquo;s tail. There are six shapes.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {YATIS.map((y) => (
                <div key={y.id} className="well rounded-lg px-3 py-2">
                  <p className="text-[15px] font-semibold text-cream">{y.name}</p>
                  <p className="font-mono text-[13px] text-cream/80">{y.shape.join(" – ")}</p>
                  <p className="text-[13px] text-muted">{y.image}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
