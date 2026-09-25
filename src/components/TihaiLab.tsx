"use client";

/**
 * Tihai: a phrase played three times that ends on beat 1.
 *
 * Phrase × 3, two equal gaps, the last note on beat 1 of a new cycle (sam).
 * The playback builds a real note line with RESTS in the gaps (karvai), so what
 * you hear is what a percussionist would clap: phrase, silence, phrase,
 * silence, phrase, then beat 1. Plain words first, Carnatic terms second.
 */

import { useMemo, useState } from "react";
import { solveTihai, tihaiTable, tihaiGrid } from "@/lib/theory/tihai";
import { METERS, saptaTalaMeters, meterById } from "@/lib/theory/meters";
import { SUBDIVISIONS, GATIS } from "@/lib/theory/resolution";
import { buildScale } from "@/lib/theory/scales";
import { Note, note } from "@/lib/theory/note";
import { DrillPlan } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import { Seg } from "./Panels";
import BeatCounter from "./BeatCounter";

/* Adi tala is Triputa in chatusra jati, which is not Triputa's default jati,
   so the seven-tala list alone leaves it out and the menu could not show it. */
const TALAS = [meterById("tala-triputa-4"),
  ...saptaTalaMeters().filter((m) => m.id !== "tala-triputa-4")];

export default function TihaiLab() {
  const [meterId, setMeterId] = useState("4-4");
  const [sub, setSub] = useState(4);
  const [phrase, setPhrase] = useState(5);
  const [bpm, setBpm] = useState(84);

  const meter = useMemo(() => meterById(meterId), [meterId]);
  const pulsesPerCycle = meter.top * sub;
  const tihai = useMemo(() => solveTihai(phrase, pulsesPerCycle), [phrase, pulsesPerCycle]);
  const grid = useMemo(() => (tihai ? tihaiGrid(tihai) : []), [tihai]);
  const table = useMemo(() => tihaiTable(pulsesPerCycle, 16), [pulsesPerCycle]);
  const gati = GATIS[phrase] ?? null;

  /* The sounding line: an ascending run through G major without its 4th (the
     app's home scale) for each repetition, with rests in the gaps. */
  const line = useMemo<(Note | null)[]>(() => {
    if (!tihai) return [];
    const scale = buildScale("G", "diatonic", 0);
    const src = scale.notes;
    const out: (Note | null)[] = [];
    for (const cell of grid) {
      if (cell === 0) { out.push(null); continue; }
      const strokeInRep = out.filter((x, i) => x !== null && grid[i] === cell).length;
      const b = src[strokeInRep % src.length];
      out.push(note(b.letter, b.alt, b.octave + Math.floor(strokeInRep / src.length)));
    }
    return out;
  }, [tihai, grid]);

  /* The playback rule: a change never stops the tihai. A new tempo lands on
     the next beat; a new tala, pulse or phrase lands on the next cycle and the
     new tihai starts there from its first stroke. */
  const plan = useMemo<DrillPlan | null>(() => line.length ? {
    notes: line,
    stepDur: 60 / bpm / sub,
    grouping: tihai ? tihai.phrase + tihai.gap : 4,
    subdivision: sub,
    beatsPerBar: meter.top,
    loop: false,
    click: true,
  } : null, [line, bpm, sub, tihai, meter.top]);
  const live = useLiveDrill(plan, () => ({ countInBeats: meter.top, beatDur: 60 / bpm }));
  const { playing, position } = live;
  const play = live.play;
  // Light the grid only when the tihai on screen is the one sounding.
  const index = position && position.plan.notes === line ? position.index : -1;

  return (
    <section className="card">
      <h2 className="display text-[22px] sm:text-[26px]">
        Tihai: a phrase played three times that ends on beat 1
      </h2>
      <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-cream/75">
        Play one phrase three times with two equal gaps, and pick the gap so the last
        note falls on beat 1 of a new cycle. Carnatic musicians call the gap the karvai
        and beat 1 sam.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="field min-w-[210px]">
          <label htmlFor="th-m">Cycle · meter or tala</label>
          <select id="th-m" className="sel" value={meterId}
                  onChange={(e) => setMeterId(e.target.value)}>
            <optgroup label="Meters">
              {METERS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
            <optgroup label="Carnatic talas">
              {TALAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="field">
          <label>Notes per beat</label>
          <Seg value={sub} ariaLabel="Notes per beat"
               options={SUBDIVISIONS.map((s) => ({ label: s.label, value: s.value }))}
               onChange={setSub} />
        </div>
        <div className="field">
          <label htmlFor="th-p">Phrase length <span className="normal-case text-cream">{phrase} notes</span>
            {gati?.name ? <span className="ml-1 normal-case text-muted">· {gati.name.toLowerCase()}</span> : null}</label>
          <input id="th-p" type="range" min={2} max={16} value={phrase}
                 onChange={(e) => setPhrase(Number(e.target.value))} className="w-44" />
        </div>
        <div className="field">
          <label htmlFor="th-b">Tempo <span className="normal-case text-cream">{bpm} bpm</span></label>
          <input id="th-b" type="range" min={40} max={160} value={bpm}
                 onChange={(e) => setBpm(Number(e.target.value))} className="w-36" />
        </div>
        <button type="button" className={`btn ${playing ? "btn-stop" : "btn-primary"} min-h-[44px] px-7 text-[15px]`}
                onClick={() => (playing ? live.stop() : void play())}
                disabled={!tihai}>
          {playing ? "Stop" : "▶ Hear it land"}
        </button>
      </div>

      {tihai ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Fact v={String(tihai.gap)} l="gap (karvai), in pulses" />
            <Fact v={String(tihai.total)} l="pulses in all" />
            <Fact v={String(tihai.cycles)} l={`cycle${tihai.cycles === 1 ? "" : "s"} of ${meter.label}`} />
            {gati?.konnakol && (
              <p className="font-mono text-[13px] text-cream/80">
                {gati.konnakol} ×3{tihai.gap > 0 ? ` · gap ${tihai.gap}` : ""}
              </p>
            )}
          </div>

          <BeatCounter at={position} beats={meter.top} bars={Math.ceil(grid.length / pulsesPerCycle)}
                       countdown={live.countdown} barLabel="cycle" className="mt-4" />

          {/* the pulse grid, one row per cycle. The LAST note is beat 1 (sam):
              the arithmetic guarantees it opens the final row at column one.
              Gold only while sounding; the three repetitions are cream, amber
              and stone, never red (red means only "the removed note"). */}
          <div className="mt-4 space-y-1.5 overflow-x-auto">
            {Array.from({ length: Math.ceil(grid.length / pulsesPerCycle) }, (_, row) => (
              <div key={row} className="flex gap-1">
                {Array.from({ length: pulsesPerCycle }, (_, col) => {
                  const i = row * pulsesPerCycle + col;
                  const cell = grid[i];
                  const lit = i === index;
                  if (cell === undefined) return <span key={col} className="h-6 w-6 shrink-0" />;
                  if (i === grid.length - 1) {
                    return <span key={col} title="the last note, on beat 1 (sam)"
                                 className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[13px] font-bold ${
                      lit ? "bg-gold text-[#17130a]" : "border-2 border-cream text-cream"}`}>1</span>;
                  }
                  return (
                    <span key={col} className={`h-6 w-6 shrink-0 rounded ${
                      lit ? "bg-gold" :
                      cell === 0 ? "border border-line bg-transparent" :
                      cell === 1 ? "bg-cream/85" : cell === 2 ? "bg-amber/80" : "bg-muted/60"}`} />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-cream/75">
            Cream, amber and grey are the three repetitions; hollow squares are the gaps.
            The square marked 1 is the last note. It opens the last row on beat 1,{" "}
            {tihai.cycles} cycle{tihai.cycles === 1 ? "" : "s"} in.
          </p>
        </>
      ) : (
        <p className="mt-5 text-[15px] text-amber">
          No gap works for a phrase of {phrase} in this cycle. Try one note longer or shorter.
        </p>
      )}

      <h3 className="mt-6 text-[15px] font-semibold text-cream">Every phrase length that works in {meter.label}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {table.map((t) => (
          <button key={t.phrase} onClick={() => setPhrase(t.phrase)}
                  aria-pressed={t.phrase === phrase}
                  className={`chip text-left ${t.phrase === phrase ? "border-cream bg-white/[0.06]" : ""}`}>
            <span className="block text-[15px] font-semibold text-cream">{t.phrase} notes</span>
            <span className="block font-mono text-[13px] text-muted">
              gap {t.gap} · {t.cycles} cycle{t.cycles === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Fact({ v, l }: { v: string; l: string }) {
  return (
    <div className="flex flex-col">
      <span className="num text-3xl leading-none text-cream">{v}</span>
      <span className="mt-1.5 font-mono text-[13px] text-muted">{l}</span>
    </div>
  );
}
