"use client";

/**
 * The movement lab for one two-triad pair.
 *
 * The ladder is Jason's: shape A in root position, shape B above it, shape A
 * in first inversion, and so on until shape A comes back an octave higher,
 * then down again. A second button plays the six-note scale the pair makes.
 * The left hand can walk the scale underneath, one note per chord, and the
 * whole thing can be laid on Rhythm cell 1 (one chord per hit), with or
 * without a hands-off bar after each played bar.
 *
 * THE PLAYBACK RULE. Everything runs on one live drill on a sixteenth-note
 * grid. Tempo lands on the next beat; a new pair, direction, chord style,
 * rhythm, left hand or "ladder ↔ scale" lands on the next bar and the music
 * never stops. The plan carries its own layout, so the chord named as sounding
 * is always the one you hear, even for the bar between a change and its
 * landing. Tapping a chord previews it only while stopped.
 *
 * Stage mode (?stage=1) draws the same player as a 1920×1080 filming frame.
 */

import { useEffect, useMemo, useState } from "react";
import { DrillPlan, previewAudio } from "@/lib/audio/engine";
import { useLiveDrill } from "@/lib/audio/useLive";
import BeatCounter from "@/components/BeatCounter";
import CellStaff, { CellItem } from "@/components/CellStaff";
import PairKeyboard, { SHAPE_TONES } from "@/components/PairKeyboard";
import { Seg } from "@/components/Panels";
import { midi, Note, notePretty, pc } from "@/lib/theory/note";
import {
  INVERSION_NAMES, LadderDirection, ladderEvents, pairLadder, parentInKey,
  scaleEvents, scaleLine, TwoChordPair,
} from "@/lib/theory/pairAtlas";
import { CellLayout, RHYTHM_MODES, RhythmMode } from "@/lib/theory/rhythmCell";
import { Item, LAB_DEFAULTS, labMaterial, LabSettings, Material, Voicing } from "@/lib/theory/pairLab";
export { LAB_DEFAULTS } from "@/lib/theory/pairLab";
export type { LabSettings } from "@/lib/theory/pairLab";

type Meta = { pairId: string; material: Material; layout: CellLayout<Item | null>; items: (Item | null)[] };
type PairPlan = DrillPlan & { meta: Meta };

const SHORT_INV = ["root", "1st", "2nd"];
/** Sixteenths per beat: the lab always runs on a sixteenth grid. */
const SUB = 4;

export default function MovementLab({ pair, source, keySignature = null, initial, onSettings, stage = false }: {
  pair: TwoChordPair;
  /** where the pair came from, e.g. "G major" */
  source: string;
  keySignature?: string | null;
  initial?: Partial<LabSettings>;
  /** told about every change, so the page can keep its link in step */
  onSettings?: (s: LabSettings) => void;
  stage?: boolean;
}) {
  const [bpm, setBpm] = useState(initial?.bpm ?? LAB_DEFAULTS.bpm);
  const [voicing, setVoicing] = useState<Voicing>(initial?.voicing ?? LAB_DEFAULTS.voicing);
  const [dir, setDir] = useState<LadderDirection>(initial?.dir ?? LAB_DEFAULTS.dir);
  const [material, setMaterial] = useState<Material>(initial?.material ?? LAB_DEFAULTS.material);
  const [rhythm, setRhythm] = useState<RhythmMode>(initial?.rhythm ?? LAB_DEFAULTS.rhythm);
  const [lh, setLh] = useState(initial?.lh ?? LAB_DEFAULTS.lh);
  const [wantPlay, setWantPlay] = useState(false);

  useEffect(() => {
    onSettings?.({ bpm, voicing, dir, material, rhythm, lh });
  }, [bpm, voicing, dir, material, rhythm, lh, onSettings]);

  const { steps, lhLine, items, layout } = useMemo(
    () => labMaterial(pair, { dir, material, rhythm, lh }), [pair, dir, material, rhythm, lh]);

  const plan = useMemo<PairPlan>(() => ({
    notes: [],
    chords: layout.steps.map((s) => s.hit ? [...s.hit.lh.map(midi), ...s.hit.rh.map(midi)] : null),
    holds: layout.steps.map((s) => (s.hit ? s.len : 1)),
    accents: layout.steps.map((s, i) => !!s.hit && i % (SUB * 4) === 0),
    spread: material === "ladder" && voicing === "arpeggio" ? 0.11 : 0.012,
    stepDur: 60 / bpm / SUB,
    grouping: SUB * 4, subdivision: SUB, beatsPerBar: 4,
    loop: true, click: false,
    meta: { pairId: pair.id, material, layout, items },
  }), [layout, items, material, voicing, bpm, pair.id]);

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

  /* Space plays and stops the ladder (not while a control has focus). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code !== "Space") return;
      if (t.closest?.('button, a[href], summary, [role="button"]')) return;
      e.preventDefault();
      if (live.playing) live.stop(); else void live.play();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live]);

  /* What is sounding, read from the plan that is sounding. */
  const p = live.position;
  const sounding = p ? (p.plan as PairPlan).meta : null;
  const cell = sounding ? sounding.layout.steps[p!.index] ?? null : null;
  const nowItem = cell && cell.held >= 0 ? sounding!.items[cell.held] ?? null : null;
  const here = !!sounding && sounding.pairId === pair.id;
  const same = here && sounding!.layout === layout;
  const litStep = here && sounding!.material === "ladder" && nowItem ? nowItem.step : -1;
  const litNote = here && sounding!.material === "scale" && nowItem ? nowItem.step : -1;
  const activeKeys = nowItem ? [...nowItem.lh.map(midi), ...nowItem.rh.map(midi)] : [];
  const clap = !!cell?.gap;
  const nowLabel = nowItem ? nowItem.label : clap ? "clap" : p ? "rest" : null;
  const activeItem = same && cell ? cell.held : -1;
  const activeGapBar = same && cell?.gap ? Math.floor(p!.index / (SUB * 4)) : -1;

  const used = useMemo(
    () => [...steps.flatMap((s) => s.voicing), ...scaleLine(pair).map(midi), ...(lh ? lhLine.map(midi) : [])],
    [steps, pair, lh, lhLine],
  );
  const [A, B] = pair.shapes;
  const shapeOfPc = (x: number): 0 | 1 => (A.notes.some((n) => pc(n) === x) ? 0 : 1);
  const extraFits = pair.fits.filter((f) => parentInKey(pair.tonic, f.parent) !== source);

  const staffItems = useMemo<(CellItem | null)[]>(() => items.map((it) => it && {
    rh: it.rh, lh: it.lh, label: material === "ladder" ? it.label : undefined,
    color: SHAPE_TONES[it.shape].ink,
  }), [items, material]);
  const staffLabel = `${material === "ladder" ? "The ladder" : "The scale"} on the staff, ${
    RHYTHM_MODES.find((r) => r.id === rhythm)?.label}`;

  const playButtons = (big: boolean) => (
    <div className="flex gap-2">
      <button type="button" onClick={() => press("ladder")}
        className={`btn ${big ? "min-w-[170px] text-[18px]" : "min-w-[132px] flex-1 sm:flex-none"} ${live.playing && material === "ladder" ? "btn-stop" : "btn-primary"}`}>
        {live.playing && material === "ladder" ? "■ Stop" : "▶ Play ladder"}
      </button>
      <button type="button" onClick={() => press("scale")}
        className={`btn ${big ? "min-w-[170px] text-[18px]" : "min-w-[132px] flex-1 sm:flex-none"} ${live.playing && material === "scale" ? "btn-stop" : "btn-ghost"}`}>
        {live.playing && material === "scale" ? "■ Stop" : "▶ Play scale"}
      </button>
    </div>
  );

  const ladderRow = (big: boolean) => (
    <ol className={`grid grid-cols-4 sm:grid-cols-7 ${big ? "gap-2.5" : "mt-2 gap-1 sm:gap-1.5"}`}>
      {steps.map((s, i) => {
        const lit = litStep === i;
        return (
          <li key={i}>
            <button type="button"
              onClick={() => { if (!live.playing) void previewAudio(s.voicing, voicing === "block" ? 0.012 : 0.11); }}
              aria-label={`${s.label}, ${INVERSION_NAMES[s.inversion]}`}
              className={`w-full rounded-lg border text-left ${big ? "px-3 py-2.5" : "px-1.5 py-2 sm:px-2"} ${lit ? "chip-lit" : "border-line bg-surface2"}`}
              style={lit ? undefined : { borderLeft: `${big ? 5 : 3}px solid ${SHAPE_TONES[s.shape].ink}` }}>
              <span className={`block truncate font-extrabold ${big ? "text-[26px] leading-tight" : "text-[15px] sm:text-[16px]"}`}
                    style={lit ? undefined : { color: big ? SHAPE_TONES[s.shape].ink : undefined }}>{s.label}</span>
              <span className={`block font-mono ${big ? "text-[15px]" : "text-[13px]"} ${lit ? "text-[#2A2208]" : "text-muted"}`}>
                {i === 6 ? "octave" : <>{SHORT_INV[s.inversion]}<span className="max-sm:hidden">{s.inversion ? " inv" : ""}</span></>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  const staff = (big: boolean) => (
    <CellStaff layout={layout as CellLayout<unknown>} items={staffItems} keySignature={keySignature}
               activeItem={activeItem} activeGapBar={activeGapBar} ariaLabel={staffLabel} big={big} />
  );

  /* ── stage: the filming frame ─────────────────────────────────────── */
  if (stage) {
    const nowShape = nowItem?.shape ?? null;
    return (
      <section aria-labelledby="pair-lab-title" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-8">
          <div>
            <h2 id="pair-lab-title" className="text-[56px] font-black leading-none tracking-[-0.03em]">
              <span style={{ color: SHAPE_TONES[0].ink }}>{A.symbol}</span>
              <span className="px-3 text-muted">+</span>
              <span style={{ color: SHAPE_TONES[1].ink }}>{B.symbol}</span>
            </h2>
            <p className="mt-2 text-[22px] text-cream/85">
              <span className="font-semibold text-cream">{source}</span>
              <span className="ml-3 font-mono text-[18px]">
                {pair.notes.map((n, i) => {
                  const lit = litNote === i || (litNote === 6 && i === 0);
                  return <span key={i} className={`mr-2 ${lit ? "text-gold" : ""}`}
                               style={lit ? undefined : { color: SHAPE_TONES[shapeOfPc(pc(n))].ink }}>{notePretty(n)}</span>;
                })}
              </span>
              {pair.removed && <span className="font-mono text-[18px] text-red">no {notePretty(pair.removed)}</span>}
            </p>
          </div>
          <div className="flex items-end gap-8">
            <div className="text-right">
              <p className="font-mono text-[15px] uppercase tracking-[0.08em] text-muted">
                {rhythm === "straight" ? "one chord per beat" : RHYTHM_MODES.find((r) => r.id === rhythm)?.label}
                {lh ? " · left hand: scale" : ""}
              </p>
              <p className="mt-1 font-mono text-[15px] uppercase tracking-[0.08em] text-muted">
                <span className="text-[26px] font-bold text-cream">{bpm}</span> bpm
              </p>
            </div>
            {playButtons(true)}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,380px)_minmax(0,1fr)] items-center gap-8">
          <div className="text-center" aria-live="off">
            <p className={`text-[112px] font-black leading-none tracking-[-0.04em] ${nowItem ? "text-gold" : clap ? "text-cream" : "text-cream/25"}`}>
              {nowLabel ?? steps[0].label}
            </p>
            <p className="mt-3 font-mono text-[18px] uppercase tracking-[0.08em] text-muted">
              {nowItem && material === "ladder"
                ? INVERSION_NAMES[steps[nowItem.step].inversion]
                : nowItem ? "scale" : clap ? "hands off" : "ready"}
              {nowShape !== null && <i className="ml-3 inline-block h-3.5 w-3.5 rounded-sm align-middle" style={{ background: SHAPE_TONES[nowShape].ink }} />}
            </p>
            <div className="mt-4 flex justify-center">
              <BeatCounter at={p} beats={4} bars={layout.bars} size="lg" />
            </div>
          </div>
          <div className="space-y-4">
            {ladderRow(true)}
            <PairKeyboard shapes={[A.notes, B.notes]} removed={pair.removed} used={used} active={activeKeys}
                          height={180} labelSize={17} />
          </div>
        </div>

        {staff(true)}
        {live.error && <p className="text-[18px] text-red-hi">{live.error}</p>}
      </section>
    );
  }

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
      {ladderRow(false)}

      <div className="mt-4">{staff(false)}</div>

      {/* ── play ───────────────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 items-end gap-x-4 gap-y-3 border-t border-line pt-4 sm:flex sm:flex-wrap">
        <div className="col-span-2">{playButtons(false)}</div>
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
          <div className="field">
            <label>Rhythm</label>
            <Seg value={rhythm} ariaLabel="Rhythm"
                 options={RHYTHM_MODES.map((r) => ({ label: r.label, value: r.id }))}
                 onChange={setRhythm} />
          </div>
          <div className="field">
            <label>Left hand</label>
            <Seg value={lh ? "scale" : "off"} ariaLabel="Left hand"
                 options={[{ label: "off", value: "off" as const }, { label: "plays the scale", value: "scale" as const }]}
                 onChange={(v) => setLh(v === "scale")} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <BeatCounter at={p} beats={4} bars={layout.bars} />
        <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
          now <span className={`ml-1 text-[17px] font-bold normal-case tracking-normal ${nowItem ? "text-gold" : "text-muted"}`}>
            {nowLabel ?? "–"}
          </span>
        </p>
      </div>
      {rhythm === "cell1-gap" && (
        <p className="mt-2 text-[15px] text-cream/75">Play a bar, then take your hands off and clap for a bar.</p>
      )}
      {live.loading && <p className="mt-2 text-[15px] text-cream/70">Loading the piano…</p>}
      {live.error && <p className="mt-2 text-[15px] text-red-hi">{live.error}</p>}
    </section>
  );
}
