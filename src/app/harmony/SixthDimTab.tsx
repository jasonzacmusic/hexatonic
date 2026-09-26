"use client";

/**
 * The sixth–diminished system of Barry Harris, with its own setup.
 *
 * You choose one of Barry's four eight-note scales and a root (G by default),
 * then work through the system in six steps: the scale, the harmonised scale,
 * drop voicings, the inversion ladder, borrowing and the diminished family.
 * Two short sections follow: "Two chords, eight notes" (every Barry scale is
 * exactly two four-note chords with no note in common) and a small bridge back
 * to the six-note scales the rest of the app is about.
 *
 * Every note, chord and name comes from src/lib/theory/barrySystem.ts, locked by
 * tests/barry-system.test.ts.
 *
 * The playback rule: one plan on the audio clock. Tempo lands on the next beat;
 * step, voicing, borrowing, direction, scale or root land on the next bar.
 * "All 12 keys" is a single looping plan round the keys in fourths, so each key
 * change is part of the music, not a restart.
 */

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DrillPlan, previewAudio, previewChords } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import BeatCounter from "@/components/BeatCounter";
import ChordStaff, { byHands, StaffChord } from "@/components/ChordStaff";
import Keyboard from "@/components/Keyboard";
import TwoChordKeys, { CHORD_A, CHORD_B } from "@/components/TwoChordKeys";
import { Seg, Toggle } from "@/components/Panels";
import { fitSixthDim, notOctatonic, prettySymbol, SixthFamily } from "@/lib/theory/barryharris";
import {
  barryRoots, barryScale, barrySplit, BORROWINGS, borrowedChord, diminishedFamily, FAMILY_INFO,
  FAMILY_ORDER, harmonisedScale, harmonisedWithBorrowing, inversionLadder, keySignatureFor,
  bebopDominant, rootsByFourths, sameRoot, SystemChord, tetradPairsCovering, voice, VoicingKind, VOICINGS,
} from "@/lib/theory/barrySystem";
import { midi, Note, noteName, notePretty, pc } from "@/lib/theory/note";
import { buildScale } from "@/lib/theory/scales";
import { optionById, PROSE, ScalePicker } from "./scaleOptions";

type StepId = "scale" | "harmonised" | "voicings" | "inversions" | "borrowing" | "family";
type Direction = "updown" | "up";

const STEPS: { id: StepId; n: string; label: string }[] = [
  { id: "scale", n: "1", label: "The scale" },
  { id: "harmonised", n: "2", label: "Harmonise it" },
  { id: "voicings", n: "3", label: "Drop voicings" },
  { id: "inversions", n: "4", label: "Inversions" },
  { id: "borrowing", n: "5", label: "Borrowing" },
  { id: "family", n: "6", label: "The family" },
];

const names = (ns: Note[]) => ns.map(notePretty).join(" ");
const P = prettySymbol;
const degree = (d: string) => d.replace(/b/g, "♭").replace(/#/g, "♯");
/** "E->F#" → "E→F♯" */
const prettyChange = (s: string) =>
  s.replace(/->/g, "→").replace(/([A-G])b/g, "$1♭").replace(/([A-G])#/g, "$1♯");

/** One pass of the chosen step in one key: what the staff, the chips and the
 *  keyboard show, and what the engine plays. */
interface Entry {
  notes: Note[];
  label: string;
  /** the sub-line on the chip */
  sub: string;
  isDiminished: boolean;
}
interface Pass {
  root: string;
  entries: Entry[];
  /** the order the entries sound in, one per beat; null is a rest */
  order: (number | null)[];
  keySignature: string | null;
}

function entriesFor(step: StepId, root: string, f: SixthFamily, voicing: VoicingKind, borrowId: string): Entry[] {
  const fromChord = (c: SystemChord, v: VoicingKind): Entry => ({
    notes: voice(c.notes, v),
    label: P(c.symbol),
    sub: c.change ? prettyChange(c.change) : c.label ?? `${notePretty(c.top)} on top`,
    isDiminished: c.isDiminished,
  });
  switch (step) {
    case "scale": {
      const bs = barryScale(root, f, 4);
      const top = bs.notes[0];
      const ns = [...bs.notes, { ...top, octave: top.octave + 1 }];
      return ns.map((n, i) => ({
        notes: [n], label: i === 8 ? "8" : degree(FAMILY_INFO[f].degrees[i]),
        sub: notePretty(n), isDiminished: i % 2 === 1,
      }));
    }
    case "harmonised": return harmonisedScale(root, f).map((c) => fromChord(c, "close"));
    case "voicings": return harmonisedScale(root, f).map((c) => fromChord(c, voicing));
    case "inversions": return inversionLadder(root, f).map((c) => ({
      ...fromChord(c, "close"), sub: c.isDiminished ? "passing" : c.label!,
    }));
    case "borrowing": return harmonisedWithBorrowing(root, f, borrowId).map((c) => fromChord(c, voicing));
    case "family": return diminishedFamily(root, f).flatMap((m) => [
      { notes: m.resolution[0], label: P(m.dimSymbol), sub: `resolves up to`, isDiminished: true },
      { notes: m.resolution[1], label: P(m.parentSymbol), sub: `from ${P(m.dimSymbol)}`, isDiminished: false },
    ]);
  }
}

/** 1 … 8 … 2, looping back to 1; or up to the octave and hold. Family: as is. */
function orderFor(n: number, step: StepId, direction: Direction, loop: boolean): (number | null)[] {
  const up = Array.from({ length: n }, (_, i) => i);
  const seq: (number | null)[] =
    step === "family" ? up
    : direction === "up" ? up
    : [...up, ...up.slice(1, -1).reverse(), ...(loop ? [] : [0])];
  while (seq.length % 4) seq.push(null);
  return seq;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export default function SixthDimTab() {
  const [family, setFamily] = useState<SixthFamily>("major6");
  const [root, setRootRaw] = useState("G");
  const [step, setStep] = useState<StepId>("harmonised");
  const [voicing, setVoicing] = useState<VoicingKind>("drop2");
  const [borrowPick, setBorrowPick] = useState<Record<SixthFamily, string>>({
    major6: "maj7", minor6: "m(maj7)", dominant7: "9", dominant7b5: "9b5",
  });
  const [direction, setDirection] = useState<Direction>("updown");
  const [loop, setLoop] = useState(true);
  const [allKeys, setAllKeys] = useState(false);
  const [bpm, setBpm] = useState(80);

  const setRoot = (r: string) => setRootRaw(sameRoot(r, family));
  const chooseFamily = (f: SixthFamily) => { setFamily(f); setRootRaw((r) => sameRoot(r, f)); };
  const roots = barryRoots(family);
  const fourths = rootsByFourths(root, family);
  const borrowId = borrowPick[family];
  const bs = useMemo(() => barryScale(root, family), [root, family]);
  const info = FAMILY_INFO[family];

  /* Every key the run visits: just this one, or all twelve in fourths. */
  const passes = useMemo<Pass[]>(() => (allKeys ? fourths : [root]).map((r) => {
    const entries = entriesFor(step, r, family, voicing, borrowId);
    return {
      root: r, entries, order: orderFor(entries.length, step, direction, loop || allKeys),
      keySignature: step === "family" ? null : keySignatureFor(r, family),
    };
  }), [allKeys, root, family, step, voicing, borrowId, direction, loop]);

  /* One plan: every pass back to back; `map` says which pass and entry each beat is. */
  const run = useMemo(() => {
    const chords: (number[] | null)[] = [];
    const map: ({ pass: number; beat: number; entry: number } | null)[] = [];
    passes.forEach((p, pi) => p.order.forEach((e, bi) => {
      chords.push(e === null ? null : p.entries[e].notes.map(midi));
      map.push(e === null ? null : { pass: pi, beat: bi, entry: e });
    }));
    return { chords, map, passes };
  }, [passes]);

  /* Remember recent runs, so the highlight follows the plan that is SOUNDING,
     which can be the previous one for up to a bar after a change. */
  const runs = useRef(new Map<unknown, typeof run>());
  if (!runs.current.has(run.chords)) {
    runs.current.set(run.chords, run);
    if (runs.current.size > 4) runs.current.delete(runs.current.keys().next().value);
  }

  const plan = useMemo<DrillPlan>(() => ({
    notes: [], chords: run.chords, accents: run.chords.map((_, i) => i % 4 === 0),
    spread: step === "scale" ? 0 : 0.012, stepDur: 60 / bpm, grouping: 4, subdivision: 1,
    beatsPerBar: 4, loop: loop || allKeys, click: false,
  }), [run, bpm, loop, allKeys, step]);
  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur: 60 / bpm }));
  const at = live.position;
  const sounding = at ? runs.current.get(at.plan.chords as unknown) : undefined;
  const now = sounding && at ? sounding.map[at.index] : null;
  const shown = (now && sounding ? sounding.passes[now.pass] : null) ?? passes[0];
  const activeBeat = now ? now.beat : -1;
  const activeEntry = now ? now.entry : -1;
  const activeNotes = activeEntry >= 0 ? shown.entries[activeEntry]?.notes ?? null : null;

  /* Left hand: the bass on the inversion ladder, the dropped voice(s) in a
     drop voicing. Close position and the scale are all right hand. */
  const leftHand = step === "inversions" ? 1
    : (step === "voicings" || step === "borrowing") && voicing !== "close" ? (voicing === "drop24" ? 2 : 1)
    : 0;
  const staff = useMemo<(StaffChord | null)[]>(
    () => shown.order.map((e) => (e === null ? null : byHands(shown.entries[e].notes, shown.entries[e].label, leftHand))),
    [shown, leftHand],
  );

  const [kbRef, kbW] = useWidth<HTMLDivElement>();
  const lo = Math.min(...shown.entries.flatMap((e) => e.notes.map(midi)));
  const hi = Math.max(...shown.entries.flatMap((e) => e.notes.map(midi)));
  const start = Math.floor(lo / 12) * 12;
  const octaves = Math.max(2, Math.ceil((hi + 1 - start) / 12));
  const keyWidth = Math.max(10, Math.min(40, kbW ? Math.floor(kbW / (octaves * 7)) : 28));
  const shownScale = useMemo(() => barryScale(shown.root, family), [shown.root, family]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const proof = notOctatonic(family);
  const moveRoot = (by: number) => setRootRaw(rootsByFourths(root, family)[(12 + by) % 12]);

  return (
    <div className="space-y-5">
      {/* ── setup ─────────────────────────────────────────────────────── */}
      <section className="card">
        <p className="eyebrow">Barry Harris · the sixth–diminished system</p>
        <p className={`mt-2 ${PROSE}`}>
          Eight notes, two chords. A 6th (or 7th) chord and a diminished 7th woven together, so every
          note of the scale has a chord and every voice moves by step.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
          <div className="field">
            <label>Scale</label>
            <Seg value={family} ariaLabel="Barry Harris scale" onChange={chooseFamily}
                 options={FAMILY_ORDER.map((f) => ({ label: FAMILY_INFO[f].short, value: f }))} />
          </div>
          <div className="field">
            <label htmlFor="bh-root">Root</label>
            <div className="flex items-center gap-1.5">
              <button type="button" className="btn btn-ghost px-3" aria-label="Previous key (down a fourth)"
                      onClick={() => moveRoot(-1)}>◀</button>
              <select id="bh-root" className="sel w-[84px]" value={root} onChange={(e) => setRoot(e.target.value)}>
                {roots.map((r) => <option key={r} value={r}>{P(r)}</option>)}
              </select>
              <button type="button" className="btn btn-ghost px-3" aria-label="Next key (up a fourth)"
                      onClick={() => moveRoot(1)}>▶</button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-cream">
            {P(root)} {info.name.toLowerCase()}
          </h2>
          <p className="font-mono text-[13px] text-muted">{info.degrees.map(degree).join(" ")}</p>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:max-w-[640px]" aria-label="The eight notes">
          {bs.notes.map((n, i) => (
            <button key={i} type="button" onClick={() => void previewAudio([midi(n)])}
              className="rounded-lg border border-line bg-surface2 px-2 py-1.5 text-center hover:border-cream/40">
              <span className="block text-[17px] font-bold" style={{ color: i % 2 ? CHORD_B : CHORD_A }}>
                {notePretty(n)}
              </span>
              <span className="block font-mono text-[13px] text-muted">{degree(info.degrees[i])}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-cream/85">
          <span className="font-bold" style={{ color: CHORD_A }}>{P(bs.chordSymbol)}</span>{" "}
          <span className="font-mono text-[14px] text-cream/75">{names(bs.chord)}</span>
          <span className="text-muted"> + </span>
          <span className="font-bold" style={{ color: CHORD_B }}>{P(bs.dimSymbol)}</span>{" "}
          <span className="font-mono text-[14px] text-cream/75">{names(bs.dim)}</span>
          {bs.relative && (
            <span className="text-cream/75"> · {P(bs.chordSymbol)} has the same notes as {P(bs.relative)}</span>
          )}
        </p>
      </section>

      {/* ── the system, step by step ───────────────────────────────────── */}
      <section className="card">
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="seg w-max" role="tablist" aria-label="The system, step by step">
            {STEPS.map((s) => (
              <button key={s.id} role="tab" type="button" data-on={step === s.id} aria-selected={step === s.id}
                      onClick={() => setStep(s.id)}>
                <span className="font-mono text-[13px] opacity-70">{s.n}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        <StepText step={step} root={root} family={family} voicing={voicing} borrowId={borrowId} />

        {(step === "voicings" || step === "borrowing") && (
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
            {step === "borrowing" && (
              <div className="field">
                <label>Borrow</label>
                <Seg value={borrowId} ariaLabel="Borrowing"
                     onChange={(id) => setBorrowPick((p) => ({ ...p, [family]: id }))}
                     options={BORROWINGS[family].map((b) => ({ label: P(borrowedChord(root, family, b.id).symbol), value: b.id }))} />
              </div>
            )}
            <div className="field">
              <label>Voicing</label>
              <Seg value={voicing} ariaLabel="Voicing" onChange={setVoicing}
                   options={VOICINGS.map((v) => ({ label: v.label, value: v.id }))} />
            </div>
          </div>
        )}

        {/* transport */}
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
          <button className={`btn ${live.playing ? "btn-stop" : "btn-primary"} min-w-[112px]`} onClick={live.toggle}>
            {live.loading ? "Loading…" : live.playing ? "■ Stop" : "▶ Play"}
          </button>
          <div className="field">
            <label htmlFor="bh-tempo">Tempo · {bpm}</label>
            <input id="bh-tempo" type="range" min={40} max={180} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))} className="w-36 accent-[#C9A227]" />
          </div>
          {step !== "family" && (
            <div className="field">
              <label>Direction</label>
              <Seg value={direction} ariaLabel="Direction" onChange={setDirection}
                   options={[{ label: "Up and down", value: "updown" as const }, { label: "Up", value: "up" as const }]} />
            </div>
          )}
          <Toggle on={loop} onClick={() => setLoop((v) => !v)}>Loop</Toggle>
          <Toggle on={allKeys} onClick={() => setAllKeys((v) => !v)}>All 12 keys</Toggle>
        </div>
        {live.error && <p className="mt-2 text-[15px] text-amber">{live.error}</p>}

        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <BeatCounter at={at} beats={4} bars={Math.ceil(shown.order.length / 4)} />
          <p className="text-[15px] text-cream/80" aria-live="polite">
            {activeEntry >= 0 ? (
              <>Now: <span className="font-bold text-gold">{shown.entries[activeEntry].label}</span>
                {step === "scale" ? <> · <span className="font-bold text-gold">{names(shown.entries[activeEntry].notes)}</span></> : null}
                {allKeys && <> · key of {P(shown.root)}</>}</>
            ) : allKeys ? `Round the keys in fourths: ${fourths.map(P).join(" ")}` : step === "scale" ? "Press play, or tap any note." : "Press play, or tap any chord."}
          </p>
        </div>

        <div className="mt-3">
          <ChordStaff chords={staff} keySignature={shown.keySignature} activeIndex={activeBeat}
                      ariaLabel={`${P(shown.root)} ${info.name}: ${STEPS[stepIndex].label}`} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {shown.entries.map((e, i) => {
            const lit = i === activeEntry;
            return (
              <button key={i} type="button"
                onClick={() => void (e.notes.length === 1 ? previewAudio([midi(e.notes[0])]) : previewAudio(e.notes.map(midi), 0.012))}
                className={`chip min-w-[64px] px-2.5 py-1.5 text-left ${lit ? "chip-lit" : ""}`}>
                <span className="block text-[15px] font-bold"
                      style={lit ? undefined : { color: e.isDiminished ? CHORD_B : CHORD_A }}>
                  {e.label}
                </span>
                <span className={`block font-mono text-[13px] ${lit ? "" : "text-muted"}`}>{e.sub}</span>
              </button>
            );
          })}
        </div>

        <div ref={kbRef} className="mt-4">
          <Keyboard scale={shownScale.notes} removed={null} octaves={octaves} startMidi={start}
                    height={104} keyWidth={keyWidth} activeMidi={activeNotes ? activeNotes.map(midi) : null}
                    onNote={(m) => void previewAudio([m])} />
        </div>

        {step === "scale" && (
          <p className="mt-3 text-[15px] leading-relaxed text-cream/75">
            Eight notes, but not the octatonic: that scale repeats every minor third and has only{" "}
            {proof.symmetricTranspositions} transpositions. This one has {proof.transpositions}
            {family === "dominant7b5" ? `: it maps onto itself a tritone away, so ${P(root)}7♭5 and ${P(sameRoot(fourths[6], family))}7♭5 share one scale.` : "."}
          </p>
        )}
        {step === "family" && <FamilyTable root={root} family={family} />}
      </section>

      <TwoChords root={root} family={family} onPick={(f) => { chooseFamily(f); setStep("scale"); }} />

      <HexatonicBridge onUse={(f, r) => { setFamily(f); setRootRaw(sameRoot(r, f)); setStep("harmonised"); }} />

      <p className="pull text-center text-[20px] text-cream/80">The sixth–diminished system of Barry Harris.</p>
    </div>
  );
}

/* ── the words for each step ─────────────────────────────────────────── */

function StepText({ step, root, family, voicing, borrowId }: {
  step: StepId; root: string; family: SixthFamily; voicing: VoicingKind; borrowId: string;
}) {
  const bs = barryScale(root, family);
  const d = FAMILY_INFO[family].degrees.map(degree);
  const chord = <span className="font-bold" style={{ color: CHORD_A }}>{P(bs.chordSymbol)}</span>;
  const dim = <span className="font-bold" style={{ color: CHORD_B }}>{P(bs.dimSymbol)}</span>;
  let text: React.ReactNode;
  switch (step) {
    case "scale":
      text = <>Play the eight notes up and down. The notes on {d[0]} {d[2]} {d[4]} {d[6]} are {chord}; the ones on {d[1]} {d[3]} {d[5]} {d[7]} are {dim}.</>;
      break;
    case "harmonised":
      text = <>A chord under every note, melody on top, close position. Under {d[0]} {d[2]} {d[4]} {d[6]} play {chord}; under {d[1]} {d[3]} {d[5]} {d[7]} play {dim}. The two chords take turns and every voice moves one step.</>;
      break;
    case "voicings":
      text = <>The same line, spread for two hands. {VOICINGS.find((v) => v.id === voicing)!.says} The melody stays on top.</>;
      break;
    case "inversions":
      text = <>{chord} through its four inversions, with {dim} passing between each one, up and back down. The bass climbs the scale.</>;
      break;
    case "borrowing": {
      const b = borrowedChord(root, family, borrowId);
      text = <>Swap a note of {chord} for its neighbour in {dim}: {b.moves.map(([a, c]) => `${notePretty(a)}→${notePretty(c)}`).join(" and ")} makes{" "}
        <span className="font-bold text-cream">{P(b.symbol)}</span> ({names(b.notes)}{b.rootless ? ", no root" : ""}). The diminished stays; the melody never moves.</>;
      break;
    }
    case "family":
      text = <>{dim} has four notes, so it has four names. Each name resolves up a semitone to its own {FAMILY_INFO[family].short.toLowerCase()} chord, a minor third apart. Every voice moves up one step.</>;
      break;
  }
  return <p className={`mt-3 ${PROSE}`}>{text}</p>;
}

/* ── f. the family, as a table ───────────────────────────────────────── */

function FamilyTable({ root, family }: { root: string; family: SixthFamily }) {
  const members = diminishedFamily(root, family);
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {members.map((m, i) => (
        <button key={i} type="button" className="well text-left hover:bg-black/30"
                onClick={() => void previewChords([m.resolution[0].map(midi), m.resolution[1].map(midi)], 0.7)}>
          <p className="text-[17px] font-bold">
            <span style={{ color: CHORD_B }}>{P(m.dimSymbol)}</span>
            <span className="text-muted"> → </span>
            <span style={{ color: CHORD_A }}>{P(m.parentSymbol)}</span>
          </p>
          <p className="mt-1 font-mono text-[13px] text-cream/75">{names(m.dim)} → {names(m.parent)}</p>
          <p className="mt-1.5 text-[15px] text-cream/75">
            Lower {notePretty(m.lowered[0])} to {notePretty(m.lowered[1])}: {P(m.dominantSymbol)}, which also goes to {P(m.parentSymbol)}.
          </p>
        </button>
      ))}
    </div>
  );
}

/* ── two chords, eight notes ─────────────────────────────────────────── */

function TwoChords({ root, family, onPick }: { root: string; family: SixthFamily; onPick: (f: SixthFamily) => void }) {
  const octatonic = useMemo(() => buildScale(sameRoot(root, "major6"), "dim-hw", 0), [root]);
  const octSplits = useMemo(() => (octatonic.error ? [] : tetradPairsCovering(octatonic.notes)), [octatonic]);
  const twoDims = octSplits.find((s) => s.a.symbol.endsWith("dim7") && s.b.symbol.endsWith("dim7"));
  const bebop = useMemo(() => bebopDominant(sameRoot(root, "major6")), [root]);
  const bebopSplits = useMemo(() => tetradPairsCovering(bebop), [bebop]);
  /* The split with a dominant 7th in it, dominant first. */
  const bebopDom = (() => {
    const isDom = (x: string) => /^[A-G][b#]?7$/.test(x);
    const s = bebopSplits.find((p) => isDom(p.a.symbol) || isDom(p.b.symbol));
    return s && (isDom(s.a.symbol) ? s : { a: s.b, b: s.a });
  })();
  /* Each chord stacked upwards from its first note, around middle C. */
  const stack = (ns: Note[]) => {
    const out: number[] = [];
    for (const n of ns) {
      let m = out.length ? out[out.length - 1] + 1 : 55;
      while (((m % 12) + 12) % 12 !== pc(n)) m++;
      out.push(m);
    }
    return out;
  };
  const hear = (a: Note[], b: Note[]) => void previewChords([stack(a), stack(b)], 0.8);

  return (
    <section className="card">
      <p className="eyebrow">Two chords, eight notes</p>
      <p className={`mt-2 ${PROSE}`}>
        Each of Barry’s scales is exactly two four-note chords that share no note. Together they use
        all eight notes, once each.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {FAMILY_ORDER.map((f) => {
          const r = sameRoot(root, f);
          const s = barrySplit(r, f);
          return (
            <div key={f} className={`well p-3 sm:p-4 ${f === family ? "ring-1 ring-cream/40" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75">{P(r)} {FAMILY_INFO[f].short}</p>
                <button type="button" className="font-mono text-[13px] text-cream/75 underline decoration-cream/30 underline-offset-4 hover:text-cream"
                        onClick={() => onPick(f)}>open</button>
              </div>
              <button type="button" className="mt-2 flex w-full flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:gap-3" onClick={() => hear(s.a.notes, s.b.notes)}
                      aria-label={`Hear ${P(s.a.symbol)} then ${P(s.b.symbol)}`}>
                <TwoChordKeys a={s.a.notes} b={s.b.notes} keyWidth={18} height={54} />
                <span className="min-w-0 text-[15px] leading-snug">
                  <span className="block font-bold" style={{ color: CHORD_A }}>{P(s.a.symbol)}</span>
                  <span className="block font-mono text-[13px] text-cream/75">{names(s.a.notes)}</span>
                  <span className="mt-1 block font-bold" style={{ color: CHORD_B }}>{P(s.b.symbol)}</span>
                  <span className="block font-mono text-[13px] text-cream/75">{names(s.b.notes)}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-5 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75">Other eight-note scales that split the same way</p>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {twoDims && (
          <div className="well">
            <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => hear(twoDims.a.notes, twoDims.b.notes)}>
              <TwoChordKeys a={twoDims.a.notes} b={twoDims.b.notes} keyWidth={20} height={58} />
              <span className="min-w-0 text-[15px] leading-snug text-cream/85">
                <span className="block font-bold text-cream">Octatonic, {P(octatonic.tonic)} half–whole</span>
                <span style={{ color: CHORD_A }} className="font-bold">{P(twoDims.a.symbol)}</span> +{" "}
                <span style={{ color: CHORD_B }} className="font-bold">{P(twoDims.b.symbol)}</span>: two diminished 7ths.
              </span>
            </button>
            <p className="mt-2 text-[15px] leading-relaxed text-cream/75">
              It splits {octSplits.length} ways in all:{" "}
              {octSplits.filter((s) => s !== twoDims).map((s) => `${P(s.a.symbol)} + ${P(s.b.symbol)}`).join(", ")}.
            </p>
          </div>
        )}
        {bebopDom && (
          <div className="well">
            <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => hear(bebopDom.a.notes, bebopDom.b.notes)}>
              <TwoChordKeys a={bebopDom.a.notes} b={bebopDom.b.notes} keyWidth={20} height={58} />
              <span className="min-w-0 text-[15px] leading-snug text-cream/85">
                <span className="block font-bold text-cream">Bebop dominant, {notePretty(bebop[0])}</span>
                <span style={{ color: CHORD_A }} className="font-bold">{P(bebopDom.a.symbol)}</span> +{" "}
                <span style={{ color: CHORD_B }} className="font-bold">{P(bebopDom.b.symbol)}</span>
                {bebopDom.b.also.length ? ` (= ${bebopDom.b.also.map(P).join(", ")})` : ""}.
              </span>
            </button>
            <p className="mt-2 text-[15px] leading-relaxed text-cream/75">
              Two chords with no shared note, but the second is not a diminished 7th, so this is not
              one of Barry’s scales. His dominant scale has the ♭6 instead of the 6.
            </p>
          </div>
        )}
      </div>
      <p className="mt-4 text-[15px] text-cream/80">
        The three-note version, two triads making six notes, is on{" "}
        <a href="?tab=pairs" className="font-semibold text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">
          Two-triad pairs
        </a>.
      </p>
    </section>
  );
}

/* ── the bridge back to six-note scales ──────────────────────────────── */

function HexatonicBridge({ onUse }: { onUse: (f: SixthFamily, root: string) => void }) {
  const [key, setKey] = useState("G");
  const [optionId, setOptionId] = useState("d0");
  const option = optionById(optionId);
  const scale = useMemo(() => option.build(key), [option, key]);
  const fits = useMemo(() => (scale.error ? [] : fitSixthDim(scale.notes)), [scale]);
  const fit = fits[0] ?? null;
  const scaleName = option.label.split(" · ")[0];

  return (
    <section className="card">
      <p className="eyebrow">Your six-note scale inside this system</p>
      <div className="mt-3">
        <ScalePicker idPrefix="bh-hex" keyName={key} setKey={setKey} optionId={optionId} setOption={setOptionId} />
      </div>
      {scale.error ? (
        <p className="mt-3 text-[15px] text-amber">{scale.error}</p>
      ) : !fit ? (
        <p className="mt-3 text-[15px] text-cream/85">
          {notePretty(scale.notes[0])} {scaleName.toLowerCase()} does not fit inside any of Barry’s four scales.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[15px] leading-relaxed text-cream/85">
            {notePretty(scale.notes[0])} {scaleName} sits inside{" "}
            <strong className="text-cream">{P(noteName(fit.root))} {FAMILY_INFO[fit.family].name.toLowerCase()}</strong>,
            which adds {fit.added.map(notePretty).join(" and ")}:
          </p>
          <div className="flex flex-wrap gap-1" aria-label="The eight notes">
            {fit.scale.map((n, i) => {
              const added = fit.added.some((a) => pc(a) === pc(n));
              return (
                <span key={i} className={`rounded-md border px-2 py-0.5 font-mono text-[15px] ${
                  added ? "border-dashed border-cream/45 text-cream/70" : "border-line bg-surface2 text-cream"}`}>
                  {notePretty(n)}
                </span>
              );
            })}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => onUse(fit.family, noteName(fit.root))}>
            Use it above
          </button>
          {fits.length > 1 && (
            <p className="w-full font-mono text-[13px] text-muted">
              Also fits: {fits.slice(1).map((f) => `${P(f.chordSymbol)} diminished`).join(", ")} · dashed = the added notes
            </p>
          )}
        </div>
      )}
    </section>
  );
}
