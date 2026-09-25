"use client";

/**
 * Sixth–diminished harmony, the method taught by Barry Harris, applied to a
 * six-note scale.
 *
 * Find the eight-note sixth–diminished scale that holds your six notes. Under
 * every melody note that belongs to the sixth chord, play the sixth chord;
 * under the others, play the diminished seventh. Everything below — which
 * scale fits, the two notes it adds, every chord and both voicings — is
 * computed by src/lib/theory/barryharris.ts and locked by its tests.
 *
 * The playback rule: the run is one plan on the audio clock. Tempo lands on
 * the next beat; voicing, borrowing, direction, key or scale land on the next
 * bar. "Round the keys" is a single looping plan through all twelve keys, so
 * the key change at the end of each pass is part of the music, not a restart.
 */

import { useMemo, useRef, useState } from "react";
import { DrillPlan, previewAudio } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import BeatCounter from "@/components/BeatCounter";
import ChordStaff, { StaffChord } from "@/components/ChordStaff";
import Keyboard from "@/components/Keyboard";
import { Seg, Toggle } from "@/components/Panels";
import {
  Borrowing, borrowingsFor, buildSixthDim, fitSixthDim, harmonise, harmoniseMelody, MelodyChord,
  notOctatonic, prettySymbol, SixthDimFit, SixthFamily, SIXTH_DIMINISHED,
} from "@/lib/theory/barryharris";
import { midi, Note, notePretty, pc } from "@/lib/theory/note";
import { KEYS, ScaleInstance } from "@/lib/theory/scales";
import { optionById, PROSE, ScalePicker } from "./scaleOptions";

type Voicing = "close" | "drop2";
type Direction = "up" | "updown";

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const names = (ns: Note[]) => ns.map(notePretty).join(" ");
const and = (ns: Note[]) => ns.map(notePretty).join(" and ");

/** The melody starts on the tonic in the octave above middle C. */
const MELODY_OCTAVE = 4;

interface KeyPass {
  key: string;
  scale: ScaleInstance;
  fit: SixthDimFit;
  chords: MelodyChord[];
}

/** Rotate KEYS so the chosen key comes first. */
const keysFrom = (k: string) => {
  const i = Math.max(0, KEYS.indexOf(k));
  return [...KEYS.slice(i), ...KEYS.slice(0, i)];
};

/** Up: 1 2 3 4 5 6 8 and a rest. Up and down: 1 … 8 … 2, then round again. */
function passOrder(len: number, direction: Direction, loop: boolean): (number | null)[] {
  const up = Array.from({ length: len }, (_, i) => i);
  const seq: (number | null)[] = direction === "up"
    ? up
    : [...up, ...up.slice(1, -1).reverse(), ...(loop ? [] : [0])];
  while (seq.length % 4) seq.push(null);
  return seq;
}

export default function SixthDimTab() {
  const [key, setKey] = useState("G");
  const [optionId, setOptionId] = useState("d0");
  const [fitIndex, setFitIndex] = useState(0);
  const [voicing, setVoicing] = useState<Voicing>("close");
  const [borrowing, setBorrowing] = useState<Borrowing>("none");
  const [direction, setDirection] = useState<Direction>("updown");
  const [loop, setLoop] = useState(true);
  const [roundKeys, setRoundKeys] = useState(false);
  const [bpm, setBpm] = useState(72);

  const option = optionById(optionId);
  const scale = useMemo(() => option.build(key), [option, key]);
  const fits = useMemo(() => (scale.error ? [] : fitSixthDim(scale.notes)), [scale]);
  const fit = fits[Math.min(fitIndex, fits.length - 1)] ?? null;
  const allowed = fit ? borrowingsFor(fit.family) : ["none" as Borrowing];
  const borrow = allowed.includes(borrowing) ? borrowing : "none";

  /* Every key the run will visit, each with its own fit of the same kind:
     the same family, rooted the same distance from the tonic. */
  const passes = useMemo<KeyPass[]>(() => {
    if (!fit) return [];
    const rel = mod12(pc(fit.root) - pc(scale.notes[0]));
    const keys = roundKeys ? keysFrom(key) : [key];
    const out: KeyPass[] = [];
    for (const k of keys) {
      const s = k === key ? scale : option.build(k);
      if (s.error) continue;
      const fs = fitSixthDim(s.notes);
      const f = fs.find((x) => x.family === fit.family && mod12(pc(x.root) - pc(s.notes[0])) === rel);
      if (!f) continue;
      out.push({ key: k, scale: s, fit: f, chords: harmoniseMelody(s.notes, f, borrow, MELODY_OCTAVE) });
    }
    return out;
  }, [fit, scale, option, key, roundKeys, borrow]);

  const voiced = (c: MelodyChord) => (voicing === "close" ? c.close : c.drop2);

  /* One plan: every pass, back to back. `map` says which key and chord each step is. */
  const run = useMemo(() => {
    const chords: (number[] | null)[] = [];
    const map: ({ pass: number; chord: number } | null)[] = [];
    passes.forEach((p, pi) => {
      for (const i of passOrder(p.chords.length, direction, loop)) {
        chords.push(i === null ? null : voiced(p.chords[i]).map(midi));
        map.push(i === null ? null : { pass: pi, chord: i });
      }
    });
    return { chords, map, passes };
  }, [passes, direction, loop, voicing]);

  /* Remember recent runs, so the highlight follows the plan that is SOUNDING,
     which can be the previous one for up to a bar after a change. */
  const runs = useRef(new Map<unknown, typeof run>());
  if (!runs.current.has(run.chords)) {
    runs.current.set(run.chords, run);
    if (runs.current.size > 4) runs.current.delete(runs.current.keys().next().value);
  }

  const plan = useMemo<DrillPlan | null>(() => run.chords.some(Boolean) ? {
    notes: [], chords: run.chords, accents: run.chords.map((_, i) => i % 4 === 0),
    spread: 0.012, stepDur: 60 / bpm, grouping: 4, subdivision: 1, beatsPerBar: 4,
    loop: loop || roundKeys, click: false,
  } : null, [run, bpm, loop, roundKeys]);
  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur: 60 / bpm }));
  const at = live.position;
  const sounding = at ? runs.current.get(at.plan.chords as unknown) : undefined;
  const step = sounding ? sounding.map[at!.index] : null;
  const shownPass = step && sounding ? sounding.passes[step.pass] : passes[0];
  const activeChord = step && shownPass ? shownPass.chords[step.chord] : null;
  const activeIndex = step ? step.chord : -1;

  const staff = useMemo<StaffChord[]>(() => (shownPass?.chords ?? []).map((c) => {
    /* Left hand: the dropped voice in drop 2, and anything below middle C. */
    const v = voiced(c);
    const left = (n: Note, i: number) => (voicing === "drop2" && i === 0) || midi(n) < 60;
    return {
      rh: v.filter((n, i) => !left(n, i)),
      lh: v.filter((n, i) => left(n, i)),
      label: prettySymbol(c.symbol),
    };
  }), [shownPass, voicing]);

  if (scale.error) return <p className="card text-amber">{scale.error}</p>;

  const scaleName = option.label.split(" · ")[0];
  const tonic = scale.notes[0];

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="eyebrow">Sixth–diminished harmony</p>
        <p className={`mt-2 ${PROSE}`}>
          A method taught by Barry Harris: the sixth chord under the chord tones, the diminished
          seventh under every other note.
        </p>
        <div className="mt-5">
          <ScalePicker idPrefix="sd" keyName={key} setKey={setKey}
                       optionId={optionId} setOption={(id) => { setOptionId(id); setFitIndex(0); }} />
        </div>

        {!fit ? (
          <p className="mt-5 text-[17px] text-cream/90">
            {notePretty(tonic)} {scaleName.toLowerCase()} does not fit inside any sixth–diminished scale,
            so this method has no chords to give it.
          </p>
        ) : (
          <>
            <p className="mt-5 text-[17px] leading-relaxed text-cream/90">
              {notePretty(tonic)} {scaleName.split(" · ")[0]} sits inside the{" "}
              <strong className="text-cream">{prettySymbol(fit.chordSymbol)} diminished scale</strong>,
              which adds {and(fit.added)}.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="The eight-note scale">
              {fit.scale.map((n, i) => {
                const added = fit.added.some((a) => pc(a) === pc(n));
                return (
                  <span key={i}
                    className={`rounded-lg border px-3 py-1.5 font-mono text-[17px] ${
                      added ? "border-dashed border-cream/45 text-cream/70" : "border-line bg-surface2 text-cream"}`}>
                    {notePretty(n)}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 font-mono text-[13px] text-muted">dashed · the two added notes</p>
            {fit.tonicReading && (
              <p className={`mt-3 ${PROSE}`}>
                Your tonic chord is {prettySymbol(fit.tonicReading)}: the same four notes as{" "}
                {prettySymbol(fit.chordSymbol)}.
                {/^[A-G][b#]?m7$/.test(fit.tonicReading) &&
                  ` So this scale fits ${prettySymbol(fit.chordSymbol)}, not ${notePretty(tonic)}m6.`}
              </p>
            )}
            {fits.length > 1 && (
              <div className="field mt-4 max-w-xs">
                <label htmlFor="sd-fit">It fits more than one: pick</label>
                <select id="sd-fit" className="sel" value={Math.min(fitIndex, fits.length - 1)}
                        onChange={(e) => setFitIndex(Number(e.target.value))}>
                  {fits.map((f, i) => (
                    <option key={i} value={i}>
                      {prettySymbol(f.chordSymbol)} diminished scale
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </section>

      {fit && shownPass && (
        <section className="card">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="well rounded-xl p-4">
              <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">under the chord tones</p>
              <p className="mt-1 text-2xl font-extrabold text-cream">{prettySymbol(shownPass.fit.chordSymbol)}</p>
              <p className="mt-1 font-mono text-[15px] text-cream/80">
                {names(shownPass.fit.chord)} · melody notes {names(shownPass.fit.chordTones)}
              </p>
            </div>
            <div className="well rounded-xl p-4">
              <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">under the others</p>
              <p className="mt-1 text-2xl font-extrabold text-cream">{prettySymbol(shownPass.fit.dimSymbol)}</p>
              <p className="mt-1 font-mono text-[15px] text-cream/80">
                {names(shownPass.fit.dim)} · melody notes {names(shownPass.fit.dimTones)}
              </p>
            </div>
          </div>

          {/* transport */}
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <button className={`btn ${live.playing ? "btn-stop" : "btn-primary"} min-w-[120px]`} onClick={live.toggle}>
              {live.playing ? "■ Stop" : "▶ Play"}
            </button>
            <div className="field">
              <label htmlFor="sd-tempo">Tempo · {bpm}</label>
              <input id="sd-tempo" type="range" min={40} max={160} value={bpm}
                     onChange={(e) => setBpm(Number(e.target.value))} className="w-40 accent-[#C9A227]" />
            </div>
            <div className="field">
              <label>Voicing</label>
              <Seg value={voicing} ariaLabel="Voicing"
                   options={[{ label: "Close", value: "close" as const }, { label: "Drop 2", value: "drop2" as const }]}
                   onChange={setVoicing} />
            </div>
            <div className="field">
              <label>Direction</label>
              <Seg value={direction} ariaLabel="Direction"
                   options={[{ label: "Up", value: "up" as const }, { label: "Up and down", value: "updown" as const }]}
                   onChange={setDirection} />
            </div>
            <div className="field">
              <label>Borrowing</label>
              <Seg value={borrow} ariaLabel="Borrowing"
                   options={allowed.map((b) => ({
                     label: b === "none" ? "Off" : b === "maj7" ? "6 → maj7" : "add 9", value: b,
                   }))}
                   onChange={setBorrowing} />
            </div>
            <Toggle on={loop} onClick={() => setLoop((v) => !v)}>Loop</Toggle>
            <Toggle on={roundKeys} onClick={() => setRoundKeys((v) => !v)}>Round the keys</Toggle>
          </div>
          <p className="mt-2 text-[15px] text-cream/75">
            {voicing === "close"
              ? "Close: all four notes inside one octave, melody on top."
              : "Drop 2: the second note from the top of the close chord, dropped an octave, for the left hand."}
            {borrow !== "none" && " Borrowing swaps one note of the sixth chord for its neighbour; the chord is named for what it becomes."}
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <BeatCounter at={at} beats={4} bars={Math.ceil(run.chords.length / 4)} />
            <p className="text-[15px] text-cream/80">
              {activeChord
                ? <>Now: <span className="font-bold text-gold">{prettySymbol(activeChord.symbol)}</span> under{" "}
                    <span className="font-bold text-gold">{notePretty(activeChord.melody)}</span>
                    {roundKeys && <> · key of {prettySymbol(shownPass.key)}</>}</>
                : roundKeys ? `Round the keys: ${passes.map((p) => prettySymbol(p.key)).join(" ")}` : "Press play."}
            </p>
          </div>

          <div className="mt-4">
            <ChordStaff chords={staff} keySignature={shownPass.scale.keySignature}
                        activeIndex={activeIndex}
                        ariaLabel={`${prettySymbol(shownPass.key)} ${scaleName}, harmonised in ${
                          voicing === "close" ? "close position" : "drop 2"}`} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {shownPass.chords.map((c, i) => (
              <button key={i} onClick={() => void previewAudio(voiced(c).map(midi), 0.012)}
                className={`chip text-left transition-colors duration-75 ${i === activeIndex ? "border-gold bg-gold/15" : "hover:border-cream/40"}`}>
                <span className={`block text-[15px] font-bold ${i === activeIndex ? "text-gold" : "text-cream"}`}>
                  {prettySymbol(c.symbol)}
                </span>
                <span className="block font-mono text-[13px] text-muted">
                  {notePretty(c.melody)} on top{c.change ? ` · ${c.change.replace(/b/g, "♭").replace(/#/g, "♯")}` : ""}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <Keyboard scale={shownPass.scale.notes} removed={null} octaves={4} startMidi={36} height={112}
                      activeMidi={activeChord ? voiced(activeChord).map(midi) : null}
                      onNote={(m) => previewAudio([m])} />
          </div>
        </section>
      )}

      <FourScales />
    </div>
  );
}

/* ── the four scales, as a compact reference ────────────────────────────── */

function FourScales() {
  const [key, setKey] = useState("G");
  const [fam, setFam] = useState<SixthFamily>("major6");
  const scale = useMemo(() => buildSixthDim(key, fam), [key, fam]);
  const steps = useMemo(() => harmonise(key, fam), [key, fam]);
  const proof = notOctatonic(fam);
  const chords = useMemo(() => [...steps, ...steps.slice(0, -1).reverse()].map((s) => s.voicing), [steps]);
  const plan = useMemo<DrillPlan>(() => ({
    notes: [], chords, accents: chords.map(() => false), spread: 0.015,
    stepDur: 0.6, grouping: 4, subdivision: 1, beatsPerBar: 4, loop: false, click: false,
  }), [chords]);
  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur: 0.6 }));
  const at = live.position && live.position.plan.chords === chords ? live.position.index : -1;
  const lit = at < 0 ? -1 : at < steps.length ? at : 2 * steps.length - 2 - at;

  return (
    <section className="card">
      <p className="eyebrow">Reference · the four sixth–diminished scales</p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="field">
          <label htmlFor="fs-key">Key</label>
          <select id="fs-key" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
            {KEYS.map((k) => <option key={k} value={k}>{prettySymbol(k)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fs-fam">Scale</label>
          <select id="fs-fam" className="sel" value={fam} onChange={(e) => setFam(e.target.value as SixthFamily)}>
            {SIXTH_DIMINISHED.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className={`btn ${live.playing ? "btn-stop" : "btn-ghost"}`} onClick={live.toggle}>
          {live.playing ? "■ Stop" : "▶ Play the movement"}
        </button>
      </div>
      <p className="mt-4 font-mono text-xl tracking-wide text-cream">{names(scale)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {steps.map((s, i) => (
          <button key={i} onClick={() => void previewAudio(s.voicing, 0.015)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors duration-75 ${
              lit === i ? "border-gold bg-gold/15" : "border-line bg-surface2 hover:border-cream/35"}`}>
            <span className={`block text-[15px] font-bold ${lit === i ? "text-gold" : s.isDiminished ? "text-cream/80" : "text-cream"}`}>
              {prettySymbol(s.label)}
            </span>
            <span className="block font-mono text-[13px] text-muted">{names(s.notes)}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-cream/80">
        Eight notes, but not the octatonic scale: that one repeats every minor third and has only{" "}
        {proof.symmetricTranspositions} transpositions; this one has {proof.transpositions}.
      </p>
    </section>
  );
}
