"use client";

/**
 * The movement lab: one exact-cover pair as a playable inversion ladder.
 *
 * Alternate degrees of the scale give the two shapes. Voicing each one from
 * every successive degree walks both shapes through every inversion, with
 * every voice moving one scale step. The exercise builder turns that into a
 * timed drill.
 *
 * The playback rule: the drill runs on the audio clock and never stops for a
 * change. Tempo and block/arpeggio land on the next pulse; a new exercise,
 * range, key or accent grouping lands on the next group and starts the new
 * drill from its first chord.
 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DrillPlan, previewAudio } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import BeatCounter from "@/components/BeatCounter";
import { Seg } from "@/components/Panels";
import { notePretty } from "@/lib/theory/note";
import { InterlockedMovement } from "@/lib/theory/movement";
import { buildPairExercise, PairExerciseId, proveExactCover } from "@/lib/theory/pairAtlas";

type Voicing = "block" | "arpeggio";

const EXERCISES: { id: PairExerciseId; title: string; note: string }[] = [
  { id: "alternating", title: "Alternating ladder", note: "switch shape every pulse" },
  { id: "shape-a", title: "Shape A only", note: "one chord, every inversion" },
  { id: "shape-b", title: "Shape B only", note: "the partner chord" },
  { id: "scale-chord", title: "Note, then chord", note: "hear the degree, then its harmony" },
  { id: "scale-up-down", title: "Scale up and down", note: "one note per pulse" },
];

export default function MovementLab({
  movement, title, description, controls,
}: {
  movement: InterlockedMovement;
  title: string;
  description: string;
  /** extra controls for the header, e.g. the key menu */
  controls?: ReactNode;
}) {
  const [exerciseId, setExerciseId] = useState<PairExerciseId>("alternating");
  const [octaves, setOctaves] = useState<1 | 2>(1);
  const [bpm, setBpm] = useState(84);
  const [accentEvery, setAccentEvery] = useState(movement.steps.length === 8 ? 4 : 3);
  const [voicing, setVoicing] = useState<Voicing>("block");

  const proof = useMemo(() => proveExactCover(movement), [movement]);
  const events = useMemo(
    () => buildPairExercise(movement, exerciseId, octaves, accentEvery),
    [movement, exerciseId, octaves, accentEvery],
  );
  const chords = useMemo(() => events.map((e) => e.voicing), [events]);
  const plan = useMemo<DrillPlan | null>(() => chords.length ? {
    notes: [], chords, accents: events.map((e) => e.accent),
    spread: voicing === "block" ? 0.012 : 0.11,
    stepDur: 60 / bpm, grouping: accentEvery, subdivision: 1, beatsPerBar: accentEvery,
    loop: true, click: false,
  } : null, [chords, events, voicing, bpm, accentEvery]);
  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur: 60 / bpm }));
  const p = live.position;
  const active = p && p.plan.chords === chords ? p.index : -1;
  const activeEvent = active >= 0 ? events[active] : null;
  /* Light the ladder step whose notes are sounding, when a chord is. */
  const activeStep = activeEvent
    ? movement.steps.findIndex((s) => s.voicing.join() === activeEvent.voicing.join())
    : -1;

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">Movement lab</p>
          <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-cream/80">{description}</p>
        </div>
        {controls}
      </div>

      <p className="mt-4 font-mono text-2xl tracking-wide text-cream">
        {movement.scale.notes.map(notePretty).join("  ")}
      </p>
      <p className="mt-1 font-mono text-[13px] text-muted">
        {proof.disjoint && proof.complete
          ? `no shared notes · all ${movement.scale.notes.length} covered`
          : "these shapes overlap"}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {movement.pairLabels.map((label, pair) => (
          <div key={pair} className={`well rounded-xl p-4 ${pair === 0 ? "border-l-2 border-l-cream/60" : ""}`}>
            <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
              shape {pair === 0 ? "A" : "B"}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-cream">{label}</p>
            {movement.steps[pair].aliases.length > 1 && (
              <p className="mt-1 font-mono text-[13px] text-muted">
                same notes: {movement.steps[pair].aliases.join(" = ")}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* the ladder itself */}
      <div className={`mt-4 grid gap-2 ${movement.steps.length === 8 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
        {movement.steps.map((step, i) => (
          <button key={step.degree}
            onClick={() => void previewAudio(step.voicing, voicing === "block" ? 0.015 : 0.12)}
            aria-label={`Play ${step.label}, ${step.inversion}`}
            className={`rounded-xl border px-3 py-3 text-left transition-colors duration-100 ${
              activeStep === i
                ? "border-gold bg-gold/15"
                : step.pair === 0
                  ? "border-cream/25 bg-surface2 hover:border-cream/50"
                  : "border-line bg-surface2 hover:border-cream/35"}`}>
            <span className={`block text-lg font-extrabold ${activeStep === i ? "text-gold" : "text-cream"}`}>
              {step.label}
            </span>
            <span className="mt-0.5 block font-mono text-[13px] text-muted">{step.inversion}</span>
            <span className="mt-1 block font-mono text-[13px] text-cream/75">
              {step.notes.map(notePretty).join(" ")}
            </span>
          </button>
        ))}
      </div>

      {/* the drill */}
      <div className="mt-6 border-t border-line pt-5">
        <p className="eyebrow">Practise it</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {EXERCISES.map((ex) => (
            <button key={ex.id} onClick={() => setExerciseId(ex.id)} aria-pressed={exerciseId === ex.id}
              className={`rounded-xl border p-3 text-left transition-colors ${
                exerciseId === ex.id ? "border-cream/70 bg-white/[0.05]" : "border-line bg-surface2 hover:border-cream/30"}`}>
              <span className="block text-[15px] font-bold">{ex.title}</span>
              <span className="mt-1 block text-[13px] text-cream/70">{ex.note}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <button className={`btn ${live.playing ? "btn-stop" : "btn-primary"} min-w-[120px]`} onClick={live.toggle}>
            {live.playing ? "■ Stop" : "▶ Play"}
          </button>
          <div className="field">
            <label htmlFor="ml-tempo">Tempo · {bpm}</label>
            <input id="ml-tempo" type="range" min={45} max={160} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))} className="w-40 accent-[#C9A227]" />
          </div>
          <div className="field">
            <label>Chords</label>
            <Seg value={voicing} ariaLabel="Chord articulation"
                 options={[{ label: "block", value: "block" as const }, { label: "arpeggio", value: "arpeggio" as const }]}
                 onChange={setVoicing} />
          </div>
          <div className="field">
            <label>Range</label>
            <Seg value={octaves} ariaLabel="Scale range"
                 options={[{ label: "1 octave", value: 1 as const }, { label: "2 octaves", value: 2 as const }]}
                 onChange={setOctaves} />
          </div>
          <div className="field">
            <label htmlFor="ml-accent">Accent every</label>
            <select id="ml-accent" className="sel !w-24" value={accentEvery}
                    onChange={(e) => setAccentEvery(Number(e.target.value))}>
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <BeatCounter at={p} beats={accentEvery} bars={Math.ceil(events.length / accentEvery)}
                     barLabel="group" className="mt-4" />
        {live.error && <p className="mt-2 text-[15px] text-red-hi">{live.error}</p>}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {events.map((event, index) => (
            <span key={event.id}
              className={`rounded-md border px-2 py-1 font-mono text-[13px] transition-colors duration-75 ${
                active === index ? "border-gold bg-gold/15 text-gold" : "border-line text-cream/75"}`}>
              {event.accent && <span aria-hidden="true">› </span>}{event.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
