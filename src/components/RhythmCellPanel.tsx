"use client";

/**
 * Practice → Rhythm cell. The scale on screen, up to the octave and back, one
 * note per hit of Rhythm cell 1 (from Jason's board): two eighths | dotted
 * eighth + sixteenth | eighth rest + eighth | quarter. Six hits a bar, so a
 * six-note scale up and back is exactly two bars. "Cell 1 + gap" plays a bar,
 * then leaves a bar for the hands to come off (clap).
 *
 * Its own live player: tempo lands on the next beat, the scale or the rhythm
 * on the next bar, and the music never stops for a change. Starting it ends
 * whatever else was playing (usePlayback).
 *
 * Hidden in stage mode unless the link says rc=1.
 */

import { useEffect, useMemo, useState } from "react";
import { DrillPlan } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import BeatCounter from "@/components/BeatCounter";
import CellStaff, { CellItem } from "@/components/CellStaff";
import { Seg } from "@/components/Panels";
import { midi, Note, notePretty } from "@/lib/theory/note";
import { CellLayout, layOnCell, RhythmMode, upAndBack } from "@/lib/theory/rhythmCell";

const INK = "#E8E0D2";
type Plan = DrillPlan & { meta: { layout: CellLayout<Note>; notes: Note[] } };

export default function RhythmCellPanel({ scale, keySignature, label, bpm }: {
  scale: Note[];
  keySignature: string | null;
  /** "G Major (no 4)" */
  label: string;
  bpm: number;
}) {
  const [mode, setMode] = useState<Exclude<RhythmMode, "straight">>("cell1");
  const [onStage, setOnStage] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setOnStage(q.get("rc") === "1" || q.get("rc") === "gap");
    if (q.get("rc") === "gap") setMode("cell1-gap");
  }, []);

  const notes = useMemo(() => upAndBack(scale), [scale]);
  const layout = useMemo(() => layOnCell(notes, mode), [notes, mode]);
  const items = useMemo<CellItem[]>(() => notes.map((n) => ({ rh: [n], lh: [], color: INK })), [notes]);

  const plan = useMemo<Plan | null>(() => notes.length ? {
    notes: [],
    chords: layout.steps.map((s) => (s.hit ? [midi(s.hit)] : null)),
    holds: layout.steps.map((s) => (s.hit ? s.len : 1)),
    accents: layout.steps.map((s, i) => !!s.hit && i % 16 === 0),
    stepDur: 60 / bpm / 4, grouping: 16, subdivision: 4, beatsPerBar: 4,
    loop: true, click: true,
    meta: { layout, notes },
  } : null, [layout, notes, bpm]);

  const live = useLiveDrill(plan, () => ({ countInBeats: 4, beatDur: 60 / bpm }));
  const p = live.position;
  const sounding = p ? (p.plan as Plan).meta : null;
  const cell = sounding ? sounding.layout.steps[p!.index] ?? null : null;
  const same = !!sounding && sounding.layout === layout;
  const now = cell?.holding ?? null;
  const activeItem = same && cell ? cell.held : -1;
  const activeGapBar = same && cell?.gap ? Math.floor(p!.index / 16) : -1;

  return (
    <section className={`card !p-3 sm:!p-5 ${onStage ? "" : "stage-hide"}`} aria-labelledby="rc-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-[62ch]">
          <h2 id="rc-title" className="text-[20px] font-extrabold tracking-[-0.01em]">Rhythm cell 1</h2>
          <p className="mt-1 text-[15px] text-cream/80">
            {label}, up and back, one note on every hit: two eighths, a dotted eighth and a
            sixteenth, an eighth rest and an eighth, then a quarter. Six hits a bar.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="field">
            <label>Rhythm</label>
            <Seg value={mode} ariaLabel="Rhythm cell"
                 options={[{ label: "Rhythm cell 1", value: "cell1" as const },
                           { label: "play a bar, clap a bar", value: "cell1-gap" as const }]}
                 onChange={setMode} />
          </div>
          <button type="button" onClick={live.toggle}
                  className={`btn min-w-[120px] ${live.playing ? "btn-stop" : "btn-primary"}`}>
            {live.playing ? "■ Stop" : "▶ Play"}
          </button>
        </div>
      </div>
      <div className="mt-4">
        <CellStaff layout={layout as CellLayout<unknown>} items={items} keySignature={keySignature}
                   activeItem={activeItem} activeGapBar={activeGapBar}
                   ariaLabel={`${label} on Rhythm cell 1`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <BeatCounter at={p} beats={4} bars={layout.bars} countdown={live.countdown} />
        <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
          now <span className={`ml-1 text-[17px] font-bold normal-case tracking-normal ${now ? "text-gold" : "text-muted"}`}>
            {now ? notePretty(now) : cell?.gap ? "clap" : "–"}
          </span>
        </p>
      </div>
      {live.error && <p className="mt-2 text-[15px] text-red-hi">{live.error}</p>}
    </section>
  );
}
