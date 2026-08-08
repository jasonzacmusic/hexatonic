"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { previewAudio } from "@/lib/audio/engine";
import { notePretty } from "@/lib/theory/note";
import { KEYS } from "@/lib/theory/scales";
import {
  buildAtlasMovement,
  buildPairExercise,
  DIATONIC_EXACT_COVERS,
  PAIR_ATLAS,
  PairAtlasEntry,
  PairExerciseId,
  proveExactCover,
} from "@/lib/theory/pairAtlas";
import { Seg } from "@/components/Panels";

type View = "new" | "all";
type Voicing = "block" | "arpeggio";

const EXERCISES: { id: PairExerciseId; title: string; note: string }[] = [
  { id: "scale-up-down", title: "Scale up + down", note: "one note per pulse" },
  { id: "shape-a", title: "Shape A inversions", note: "one chord family only" },
  { id: "shape-b", title: "Shape B inversions", note: "the partner family" },
  { id: "alternating", title: "Alternating ladder", note: "switch every pulse" },
  { id: "scale-chord", title: "Note → chord answer", note: "hear degree and harmony" },
];

const EVIDENCE_LABEL = {
  documented: "popular / documented",
  specialist: "specialist repertoire",
  theory: "theory discovery",
} as const;

function AtlasCard({ entry, selected, onSelect }: {
  entry: PairAtlasEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-gold bg-gold/[0.09] shadow-[0_0_28px_rgba(201,162,39,0.12)]"
          : "border-line bg-surface2 hover:border-cream/30"
      }`}
    >
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] ${
          entry.status === "new-lesson"
            ? "border-gold/45 bg-gold/10 text-gold"
            : "border-line text-muted"
        }`}>
          {entry.status === "new-lesson" ? "new lesson" : "taught 2025"}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-muted">
          {EVIDENCE_LABEL[entry.evidence]}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-extrabold text-cream">{entry.title}</h3>
      <p className="mt-1 text-xs text-muted">{entry.subtitle}</p>
      <p className="mt-3 font-mono text-xs text-gold">{entry.formula}</p>
    </button>
  );
}

function useExerciseRunner() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [active, setActive] = useState<number | null>(null);

  const cancel = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    setActive(null);
  }, []);

  useEffect(() => cancel, [cancel]);

  const run = useCallback((
    events: ReturnType<typeof buildPairExercise>,
    bpm: number,
    voicing: Voicing,
  ) => {
    cancel();
    const pulseMs = 60_000 / bpm;
    events.forEach((event, index) => {
      timers.current.push(setTimeout(() => {
        setActive(index);
        const spread = event.voicing.length === 1 ? 0 : voicing === "block" ? 0.012 : 0.11;
        void previewAudio(event.voicing, spread, event.accent ? 0.95 : 0.62);
      }, index * pulseMs));
    });
    timers.current.push(setTimeout(() => setActive(null), events.length * pulseMs));
  }, [cancel]);

  return { active, cancel, run };
}

export default function PairAtlas({ onOpenBarry }: { onOpenBarry: () => void }) {
  const [view, setView] = useState<View>("new");
  const [entryId, setEntryId] = useState(PAIR_ATLAS[0].id);
  const entry = PAIR_ATLAS.find((item) => item.id === entryId) ?? PAIR_ATLAS[0];
  const [keyName, setKeyName] = useState(entry.defaultKey);
  const [exerciseId, setExerciseId] = useState<PairExerciseId>("alternating");
  const [octaves, setOctaves] = useState<1 | 2>(2);
  const [bpm, setBpm] = useState(88);
  const [accentEvery, setAccentEvery] = useState(3);
  const [voicing, setVoicing] = useState<Voicing>("block");
  const runner = useExerciseRunner();

  const visibleEntries = view === "new"
    ? PAIR_ATLAS.filter((item) => item.status === "new-lesson")
    : PAIR_ATLAS;
  const movement = useMemo(() => buildAtlasMovement(entry, keyName), [entry, keyName]);
  const proof = useMemo(() => proveExactCover(movement), [movement]);
  const events = useMemo(
    () => buildPairExercise(movement, exerciseId, octaves, accentEvery),
    [movement, exerciseId, octaves, accentEvery],
  );

  const selectEntry = (next: PairAtlasEntry) => {
    runner.cancel();
    setEntryId(next.id);
    setKeyName(next.defaultKey);
  };

  return (
    <div className="space-y-5">
      <section className="card border-gold/35">
        <p className="eyebrow">Pair Atlas · exact-cover finder</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-extrabold">
          Two shapes. No shared notes. Nothing left over.
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-cream/80">
          This is the property behind the inversion-switching exercise. The atlas
          proves the cover, labels what your 2025 lesson already taught, and keeps
          the next video on genuinely new musical ground.
        </p>
        <div className="mt-5">
          <Seg
            value={view}
            ariaLabel="Pair atlas lesson filter"
            options={[
              { label: "new lesson only", value: "new" as const },
              { label: "include 2025 lesson", value: "all" as const },
            ]}
            onChange={setView}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleEntries.map((item) => (
          <AtlasCard
            key={item.id}
            entry={item}
            selected={item.id === entry.id}
            onSelect={() => selectEntry(item)}
          />
        ))}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-gold/45 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-gold">
                {entry.voices === 3 ? "hexatonic · two triads" : "octatonic · two seventh chords"}
              </span>
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-muted">
                {EVIDENCE_LABEL[entry.evidence]}
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">{entry.title}</h2>
            <p className="quiet mt-2">{entry.lessonAngle}</p>
          </div>
          <div className="field">
            <label htmlFor="atlas-key">Key</label>
            <select
              id="atlas-key"
              className="sel"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
            >
              {KEYS.map((key) => <option key={key}>{key}</option>)}
            </select>
          </div>
        </div>

        <p className="mt-5 font-mono text-2xl text-gold">
          {movement.scale.notes.map(notePretty).join("  ")}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {movement.pairLabels.map((label, pair) => {
            const steps = movement.steps.filter((step) => step.pair === pair);
            return (
              <div key={label} className={`rounded-xl border p-4 ${
                pair === 0 ? "border-gold/40 bg-gold/[0.07]" : "border-line bg-surface2"
              }`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  shape {pair === 0 ? "A" : "B"}
                </p>
                <p className={`mt-1 text-2xl font-extrabold ${pair === 0 ? "text-gold" : "text-cream"}`}>
                  {label}
                </p>
                <p className="mt-2 font-mono text-[11px] text-muted">
                  {steps.map((step) => step.notes.map(notePretty).join(" ")).join(" · ")}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface2 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">shared notes</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-gold">{proof.disjoint ? "0 · disjoint" : "overlap"}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface2 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">coverage</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-gold">
              {proof.complete ? `${movement.scale.notes.length}/${movement.scale.notes.length} · exact` : "incomplete"}
            </p>
          </div>
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-line bg-surface2 px-3 py-2 transition hover:border-gold/50"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">lineage</p>
            <p className="mt-0.5 text-sm font-semibold text-cream">{entry.sourceLabel} ↗</p>
          </a>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Piano practice builder</p>
        <h2 className="mt-2 text-2xl font-extrabold">Turn the theory into a timed exercise.</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {EXERCISES.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => { runner.cancel(); setExerciseId(exercise.id); }}
              aria-pressed={exerciseId === exercise.id}
              className={`rounded-xl border p-3 text-left transition ${
                exerciseId === exercise.id
                  ? "border-gold bg-gold/[0.08]"
                  : "border-line bg-surface2 hover:border-cream/30"
              }`}
            >
              <span className="block text-sm font-bold">{exercise.title}</span>
              <span className="mt-1 block text-[11px] text-muted">{exercise.note}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div className="field">
            <label>Range</label>
            <Seg
              value={octaves}
              ariaLabel="Exercise octave range"
              options={[{ label: "1 octave", value: 1 as const }, { label: "2 octaves", value: 2 as const }]}
              onChange={setOctaves}
            />
          </div>
          <div className="field">
            <label>Chords</label>
            <Seg
              value={voicing}
              ariaLabel="Exercise chord articulation"
              options={[{ label: "block", value: "block" as const }, { label: "arpeggio", value: "arpeggio" as const }]}
              onChange={setVoicing}
            />
          </div>
          <div className="field">
            <label htmlFor="atlas-accent">Accent every</label>
            <select
              id="atlas-accent"
              className="sel !w-24"
              value={accentEvery}
              onChange={(event) => setAccentEvery(Number(event.target.value))}
            >
              {[2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="atlas-tempo">Tempo · {bpm}</label>
            <input
              id="atlas-tempo"
              type="range"
              min={45}
              max={160}
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
              className="w-40 accent-[#C9A227]"
            />
          </div>
          <button className="btn btn-primary" onClick={() => runner.run(events, bpm, voicing)}>
            ▶ Start exercise
          </button>
          <button className="btn btn-ghost" onClick={runner.cancel}>Stop</button>
        </div>

        <div className="mt-5 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => (
            <button
              key={event.id}
              onClick={() => void previewAudio(
                event.voicing,
                event.voicing.length === 1 ? 0 : voicing === "block" ? 0.012 : 0.11,
                event.accent ? 0.95 : 0.62,
              )}
              aria-label={`Play ${event.label}`}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                runner.active === index
                  ? "border-gold bg-gold/15"
                  : event.pair === 0
                    ? "border-gold/30 bg-gold/[0.05]"
                    : "border-line bg-surface2 hover:border-cream/30"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`h-1.5 w-1.5 rounded-full ${event.accent ? "bg-gold" : "bg-line"}`} />
                {event.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">The exhaustive diatonic theorem</p>
        <h2 className="mt-2 text-2xl font-extrabold">Seven adjacent pairs. Seven omitted notes.</h2>
        <p className="quiet mt-2 max-w-3xl">
          In any major scale, adjacent diatonic triads never share a note. Every pair
          therefore makes one exact six-note collection, omitting a different scale
          degree. The app surfaces all seven without pretending all seven are equally common.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DIATONIC_EXACT_COVERS.map((item) => (
            <div key={item.pair} className="rounded-lg border border-line bg-surface2 p-3">
              <p className="text-base font-bold">{item.pair}</p>
              <p className="mt-1 font-mono text-[11px] text-gold">omits {item.omitted}</p>
              <p className="mt-2 text-[11px] text-muted">{item.lesson}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card border-amber/30">
        <p className="eyebrow text-amber">The genuinely new eight-note sequel</p>
        <h2 className="mt-2 text-2xl font-extrabold">Barry’s two dominant families were not in the 2025 lesson.</h2>
        <p className="quiet mt-2 max-w-3xl">
          Major 6 diminished and minor 6 diminished are marked as previous material.
          Seventh Diminished and Seventh Flat Five Diminished are the new candidates;
          the Barry lab already contains all four, every inversion, borrowing, and
          the related-dominant family.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip text-muted">Major 6 diminished · taught</span>
          <span className="chip text-muted">Minor 6 diminished · taught</span>
          <span className="chip border-gold/40 text-gold">Seventh diminished · new</span>
          <span className="chip border-gold/40 text-gold">Seventh ♭5 diminished · new</span>
        </div>
        <button className="btn btn-primary mt-4" onClick={onOpenBarry}>
          Open the four-family Barry lab →
        </button>
      </section>
    </div>
  );
}
