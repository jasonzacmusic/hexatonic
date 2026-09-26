"use client";

/**
 * The movement lab for one two-triad pair.
 *
 * The ladder is Jason's: shape A in root position, shape B above it, shape A
 * in first inversion, and so on until shape A comes back an octave higher,
 * then down again. A second button plays the six-note scale the pair makes.
 *
 * THE PLAYBACK RULE. Both run on one live drill. Tempo lands on the next beat;
 * a new pair, direction, chord style or "ladder ↔ scale" lands on the next bar
 * and the music never stops. The plan carries its own events, so the chord
 * named as sounding is always the one you hear, even for the bar between a
 * change and its landing. Tapping a chord previews it only while stopped, so
 * two players can never overlap.
 */

import { useEffect, useMemo, useState } from "react";
import { DrillPlan, previewAudio } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import BeatCounter from "@/components/BeatCounter";
import PairKeyboard, { SHAPE_TONES } from "@/components/PairKeyboard";
import { Seg } from "@/components/Panels";
import { notePretty, pc } from "@/lib/theory/note";
import {
  INVERSION_NAMES, LadderDirection, ladderEvents, PAIR_BEATS, pairLadder, PairEvent, parentInKey,
  scaleEvents, TwoChordPair,
} from "@/lib/theory/pairAtlas";

type Material = "ladder" | "scale";
type Voicing = "block" | "arpeggio";

type PairPlan = DrillPlan & { meta: { pairId: string; material: Material; events: PairEvent[] } };

const SHORT_INV = ["root", "1st", "2nd"];

export default function MovementLab({ pair, source }: {
  pair: TwoChordPair;
  /** where the pair came from, e.g. "G major" */
  source: string;
}) {
  const [bpm, setBpm] = useState(76);
  const [voicing, setVoicing] = useState<Voicing>("block");
  const [dir, setDir] = useState<LadderDirection>("up-down");
  const [material, setMaterial] = useState<Material>("ladder");
  const [wantPlay, setWantPlay] = useState(false);

  const steps = useMemo(() => pairLadder(pair), [pair]);
  const ladder = useMemo(() => ladderEvents(steps, dir), [steps, dir]);
  const scale = useMemo(() => scaleEvents(pair), [pair]);
  const events = material === "ladder" ? ladder : scale;

  const plan = useMemo<PairPlan>(() => ({
    notes: [],
    chords: events.map((e) => e.voicing),
    accents: events.map((e) => e.accent),
    spread: material === "ladder" && voicing === "arpeggio" ? 0.11 : 0.012,
    stepDur: 60 / bpm,
    grouping: PAIR_BEATS, subdivision: 1, beatsPerBar: PAIR_BEATS,
    loop: true, click: false,
    meta: { pairId: pair.id, material, events },
  }), [events, material, voicing, bpm, pair.id]);

  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur: 60 / bpm }));

  /* Start only after the render that holds the chosen material, so Play never
     starts the previous one. */
  useEffect(() => {
    if (!wantPlay) return;
    setWantPlay(false);
    if (!live.playing) void live.play();
  }, [wantPlay, live]);

  const press = (m: Material) => {
    if (live.playing && material === m) { live.stop(); return; }
    setMaterial(m);
    if (!live.playing) setWantPlay(true);
  };

  /* What is sounding, read from the plan that is sounding. */
  const p = live.position;
  const sounding = p ? (p.plan as PairPlan).meta : null;
  const now = sounding ? sounding.events[p!.index] ?? null : null;
  const here = !!sounding && sounding.pairId === pair.id;
  const litStep = here && sounding!.material === "ladder" && now?.step != null ? now.step : -1;
  const litNote = here && sounding!.material === "scale" && now?.step != null ? now.step : -1;
  const activeKeys = now?.voicing ?? [];
  const nowLabel = now ? (now.voicing ? now.label : "hold") : null;

  const used = useMemo(
    () => [...steps.flatMap((s) => s.voicing), ...scale.flatMap((e) => e.voicing ?? [])],
    [steps, scale],
  );
  const [A, B] = pair.shapes;
  const shapeOfPc = (x: number): 0 | 1 => (A.notes.some((n) => pc(n) === x) ? 0 : 1);
  const extraFits = pair.fits.filter((f) => parentInKey(pair.tonic, f.parent) !== source);

  return (
    <section className="card" aria-labelledby="pair-lab-title">
      {/* ── what this pair is ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="eyebrow">Practise the pair</p>
        {pair.roman && <p className="font-mono text-[13px] text-muted">{source} · {pair.roman}</p>}
      </div>
      <h2 id="pair-lab-title" className="mt-2 text-3xl font-black tracking-[-0.02em]">
        <span style={{ color: SHAPE_TONES[0].ink }}>{A.symbol}</span>
        <span className="px-2 text-muted">+</span>
        <span style={{ color: SHAPE_TONES[1].ink }}>{B.symbol}</span>
      </h2>
      <p className="mt-2 text-[16px] leading-snug text-cream">
        <span className="font-semibold">{pair.name}</span>
        {pair.modal && <span className="text-cream/70"> · {pair.modal}</span>}
      </p>

      {/* the six notes, each in its chord's colour, and the one left out */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="The six notes">
        {pair.notes.map((n, i) => {
          const s = shapeOfPc(pc(n));
          const lit = litNote === i || (litNote === 6 && i === 0);
          return (
            <span key={i}
              className={`min-w-[2.25rem] rounded-lg border px-1.5 py-1 sm:min-w-[2.6rem] sm:px-2 text-center font-mono text-[15px] font-semibold ${
                lit ? "chip-lit" : "border-line bg-surface2"}`}
              style={lit ? undefined : { color: SHAPE_TONES[s].ink }}>
              {notePretty(n)}
            </span>
          );
        })}
        {pair.removed && (
          <span className="ml-1 rounded-lg border border-red/60 px-2 py-1 font-mono text-[14px] text-red"
                title="the parent note this pair leaves out">
            no <s className="decoration-2">{notePretty(pair.removed)}</s>
          </span>
        )}
      </div>
      {(extraFits.length > 0 || pair.rootless) && (
        <p className="mt-2 text-[15px] text-cream/75">
          {pair.rootless
            ? `No ${notePretty(pair.tonic)}: this pair leaves out the home note, so it floats.`
            : `Same six notes are also inside ${extraFits
                .map((f) => `${parentInKey(pair.tonic, f.parent)} (add ${notePretty(f.add)})`).join(" and ")}.`}
        </p>
      )}

      {/* legend + keyboard */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-cream/80">
        {[A, B].map((c, s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: SHAPE_TONES[s].ink }} aria-hidden="true" />
            {c.symbol}: {c.notes.map(notePretty).join(" ")}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-3 w-3 rounded-sm bg-gold" aria-hidden="true" /> sounding
        </span>
      </div>
      <div className="mt-3">
        <PairKeyboard shapes={[A.notes, B.notes]} removed={pair.removed} used={used} active={activeKeys} />
      </div>

      {/* ── the ladder ─────────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[17px] font-bold">The ladder: both chords, every inversion</h3>
        <p className="font-mono text-[13px] text-muted">
          {pair.stepwise ? "every voice moves one note up" : "the chords overlap, so voices cross"}
        </p>
      </div>
      <ol className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-7 sm:gap-1.5">
        {steps.map((s, i) => {
          const lit = litStep === i;
          return (
            <li key={i}>
              <button type="button"
                onClick={() => { if (!live.playing) void previewAudio(s.voicing, voicing === "block" ? 0.012 : 0.11); }}
                aria-label={`${s.label}, ${INVERSION_NAMES[s.inversion]}`}
                className={`w-full rounded-lg border px-1.5 py-2 text-left sm:px-2 ${lit ? "chip-lit" : "border-line bg-surface2"}`}
                style={lit ? undefined : { borderLeft: `3px solid ${SHAPE_TONES[s.shape].ink}` }}>
                <span className="block truncate text-[15px] font-extrabold sm:text-[16px]">{s.label}</span>
                <span className={`block font-mono text-[13px] ${lit ? "text-[#2A2208]" : "text-muted"}`}>
                  {i === 6 ? "octave" : <>{SHORT_INV[s.inversion]}<span className="max-sm:hidden">{s.inversion ? " inv" : ""}</span></>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── play ───────────────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 items-end gap-x-4 gap-y-3 border-t border-line pt-4 sm:flex sm:flex-wrap">
        <div className="col-span-2 flex gap-2">
          <button type="button" onClick={() => press("ladder")}
            className={`btn min-w-[132px] flex-1 sm:flex-none ${live.playing && material === "ladder" ? "btn-stop" : "btn-primary"}`}>
            {live.playing && material === "ladder" ? "■ Stop" : "▶ Play ladder"}
          </button>
          <button type="button" onClick={() => press("scale")}
            className={`btn min-w-[132px] flex-1 sm:flex-none ${live.playing && material === "scale" ? "btn-stop" : "btn-ghost"}`}>
            {live.playing && material === "scale" ? "■ Stop" : "▶ Play scale"}
          </button>
        </div>
        <div className="field col-span-2">
          <label htmlFor="pl-tempo">Tempo · {bpm}</label>
          <input id="pl-tempo" type="range" min={40} max={160} value={bpm}
                 onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-[#C9A227] sm:w-36" />
        </div>
        <div className="col-span-2 flex flex-wrap items-end gap-x-4 gap-y-3 whitespace-nowrap">
        <div className="field">
          <label>Chords</label>
          <Seg value={voicing} ariaLabel="Chord style"
               options={[{ label: "block", value: "block" as const }, { label: "arpeggio", value: "arpeggio" as const }]}
               onChange={setVoicing} />
        </div>
        <div className="field">
          <label>Ladder</label>
          <Seg value={dir} ariaLabel="Ladder direction"
               options={[{ label: "both ways", value: "up-down" as const }, { label: "up", value: "up" as const }]}
               onChange={setDir} />
        </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <BeatCounter at={p} beats={PAIR_BEATS} bars={Math.ceil(events.length / PAIR_BEATS)} />
        <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
          now <span className={`ml-1 text-[17px] font-bold normal-case tracking-normal ${nowLabel ? "text-gold" : "text-muted"}`}>
            {nowLabel ?? "–"}
          </span>
        </p>
      </div>
      {live.loading && <p className="mt-2 text-[15px] text-cream/70">Loading the piano…</p>}
      {live.error && <p className="mt-2 text-[15px] text-red-hi">{live.error}</p>}
    </section>
  );
}
