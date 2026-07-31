"use client";

/**
 * The tihai lab — the resolution solver's sequel.
 *
 * Phrase × 3, two equal gaps, last stroke on sam. The playback builds a real
 * note line with RESTS in the karvai, so what you hear is what a percussionist
 * would clap: phrase, silence, phrase, silence, phrase — sam.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { solveTihai, tihaiTable, tihaiGrid } from "@/lib/theory/tihai";
import { METERS, saptaTalaMeters, meterById } from "@/lib/theory/meters";
import { SUBDIVISIONS, GATIS } from "@/lib/theory/resolution";
import { buildScale } from "@/lib/theory/scales";
import { Note, note } from "@/lib/theory/note";
import { getAudio } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/audio/usePlayback";
import { Seg } from "./Panels";

export default function TihaiLab() {
  const [meterId, setMeterId] = useState("tala-triputa-4");   // Adi
  const [sub, setSub] = useState(4);
  const [phrase, setPhrase] = useState(5);
  const [bpm, setBpm] = useState(84);
  const [index, setIndex] = useState(-1);
  const raf = useRef<number | null>(null);

  const meter = useMemo(() => meterById(meterId), [meterId]);
  const pulsesPerCycle = meter.top * sub;
  const tihai = useMemo(() => solveTihai(phrase, pulsesPerCycle), [phrase, pulsesPerCycle]);
  const grid = useMemo(() => (tihai ? tihaiGrid(tihai) : []), [tihai]);
  const table = useMemo(() => tihaiTable(pulsesPerCycle, 16), [pulsesPerCycle]);
  const gati = GATIS[phrase] ?? null;

  /* The sounding line: an ascending run through the minor hexatonic for each
     repetition, rests in the karvai, and the upper tonic as the sam stroke. */
  const line = useMemo<(Note | null)[]>(() => {
    if (!tihai) return [];
    const scale = buildScale("C", "diatonic", 4);
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

  const clearVisuals = useCallback(() => {
    setIndex(-1);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);
  const pb = usePlayback("drill", clearVisuals);
  const playing = pb.playing;

  const play = useCallback(async () => {
    if (!line.length) return;
    await pb.begin(async (guard) => {
      const a = getAudio();
      try { await a.init(); } catch { return false; }
      if (!guard()) return false;
      const ok = await a.start({
        notes: line,
        stepDur: 60 / bpm / sub,
        grouping: tihai ? tihai.phrase + tihai.gap : 4,
        subdivision: sub,
        beatsPerBar: meter.top,
        loop: false,
        click: true,
        countInBeats: meter.top,
        beatDur: 60 / bpm,
        onStop: () => { if (guard()) pb.end(); },
      });
      if (!ok || !guard()) return false;
      const tick = () => {
        if (!guard()) return;
        setIndex(a.currentIndex());
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [line, bpm, sub, meter.top, tihai, pb]);

  const REP_TONE = ["", "text-gold", "text-cream", "text-red-hi"];

  return (
    <section className="card">
      <h2 className="text-xl font-extrabold">Tihai generator</h2>
      <p className="mt-2 max-w-3xl text-muted">
        The solver above asks how long a grouping takes to resolve. A <em>tihai</em> asks
        the inverse: one phrase, played three times with two equal gaps (the <em>karvai</em>),
        landing its final stroke exactly on sam. Same clock arithmetic, run backwards.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="field min-w-[210px]">
          <label htmlFor="th-m">Tala / meter</label>
          <select id="th-m" className="sel" value={meterId}
                  onChange={(e) => setMeterId(e.target.value)}>
            <optgroup label="Sapta talas">
              {saptaTalaMeters().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
            <optgroup label="Western meters">
              {METERS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="field">
          <label>Pulse</label>
          <Seg value={sub} ariaLabel="Tihai subdivision"
               options={SUBDIVISIONS.map((s) => ({ label: s.label, value: s.value }))}
               onChange={setSub} />
        </div>
        <div className="field">
          <label htmlFor="th-p">Phrase length <span className="text-gold">{phrase}</span>
            {gati?.name ? <span className="ml-1 text-muted">· {gati.name}</span> : null}</label>
          <input id="th-p" type="range" min={2} max={16} value={phrase}
                 onChange={(e) => setPhrase(Number(e.target.value))} className="w-44" />
        </div>
        <div className="field">
          <label htmlFor="th-b">Tempo <span className="text-gold">{bpm}</span></label>
          <input id="th-b" type="range" min={40} max={160} value={bpm}
                 onChange={(e) => setBpm(Number(e.target.value))} className="w-36" />
        </div>
        <button className={`btn ${playing ? "btn-stop" : "btn-primary"} px-7`}
                onClick={() => (playing ? pb.end() : void play())}
                disabled={!tihai}>
          {playing ? "STOP" : "▶ Hear it land"}
        </button>
      </div>

      {tihai ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Fact v={String(tihai.gap)} l="karvai (gap) pulses" gold={tihai.gap === 0} />
            <Fact v={String(tihai.total)} l="total pulses" />
            <Fact v={String(tihai.cycles)} l={`cycle${tihai.cycles === 1 ? "" : "s"} of ${meter.label}`} />
            {gati?.konnakol && (
              <p className="font-mono text-[12px] text-gold">
                {gati.konnakol} ×3{tihai.gap > 0 ? ` · karvai ${tihai.gap}` : ""}
              </p>
            )}
          </div>

          {/* the pulse grid, one row per cycle. The LAST stroke is sam — the
              arithmetic guarantees it opens the final row at column one. */}
          <div className="mt-4 space-y-1.5 overflow-x-auto">
            {Array.from({ length: Math.ceil(grid.length / pulsesPerCycle) }, (_, row) => (
              <div key={row} className="flex gap-1">
                {Array.from({ length: pulsesPerCycle }, (_, col) => {
                  const i = row * pulsesPerCycle + col;
                  const cell = grid[i];
                  const lit = i === index;
                  if (cell === undefined) return <span key={col} className="h-6 w-6 shrink-0" />;
                  if (i === grid.length - 1) {
                    return <span key={col} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${
                      lit ? "bg-gold text-[#17130a]" : "border border-gold bg-gold/25 text-gold"}`}>S</span>;
                  }
                  return (
                    <span key={col} className={`h-6 w-6 shrink-0 rounded ${
                      lit ? "bg-gold" :
                      cell === 0 ? "border border-line bg-transparent" :
                      cell === 1 ? "bg-cream/85" : cell === 2 ? "bg-amber/80" : "bg-red/70"}`} />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="quiet mt-2">
            Cream, amber, red — the three repetitions. Hollow squares are the karvai.
            The final stroke <span className="text-gold">S</span> IS sam — watch it open
            the last row on the one, {tihai.cycles} cycle{tihai.cycles === 1 ? "" : "s"} in.
          </p>
        </>
      ) : (
        <p className="mt-5 text-sm text-amber">
          No clean tihai for that phrase in this cycle — an odd/even dead end. Nudge the
          phrase length by one.
        </p>
      )}

      <h3 className="mt-6 text-sm font-semibold">Every phrase that works in {meter.label}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {table.map((t) => (
          <button key={t.phrase} onClick={() => setPhrase(t.phrase)}
                  className={`chip text-left ${t.phrase === phrase ? "chip-lit" : ""}`}>
            <span className="block text-sm font-semibold">{t.phrase} pulses</span>
            <span className="block font-mono text-[10px] text-muted">
              karvai {t.gap} · {t.cycles} cycle{t.cycles === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Fact({ v, l, gold }: { v: string; l: string; gold?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`num text-3xl leading-none ${gold ? "text-gold" : ""}`}>{v}</span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{l}</span>
    </div>
  );
}
