"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Notation from "@/components/Notation";
import Keyboard from "@/components/Keyboard";
import ScaleRing from "@/components/ScaleRing";
import { ResolutionBanner, ScaleChips, Seg, Toggle, groupingLabel } from "@/components/Panels";
import { useDrill, DrillState } from "@/lib/useDrill";
import { FAMILIES, DIATONIC_MODES, KEYS, buildScale } from "@/lib/theory/scales";
import {
  PATTERNS, PATTERN_FAMILIES, patternFamilyOf, describeSkip, PatternId,
} from "@/lib/theory/patterns";
import { SUBDIVISIONS, gatiFor } from "@/lib/theory/resolution";
import { METERS, saptaTalaMeters } from "@/lib/theory/meters";
import { midi, notePretty, pc } from "@/lib/theory/note";
import { findChords, tertianOnly } from "@/lib/theory/chords";
import { FUNCTION_LABEL, HarmonicFunction, harmonicFunction, romanNumeral, triadQuality } from "@/lib/theory/functions";
import { previewAudio } from "@/lib/audio/engine";
import CustomBuilder from "@/components/CustomBuilder";
import MidiPanel from "@/components/MidiPanel";
import Fretboard from "@/components/Fretboard";
import KeyChips, { prettyKey, stepKey } from "./KeyChips";
import { ROUTINES, SPEEDS, stepState } from "./routines";
import {
  groupFamilies, isSixNoteSound, prettyDegree, ragasForScale, topNoteCost, tripletHint,
} from "./scaleFacts";

const GROUPINGS = [3, 4, 5, 6, 7, 9];

type Drill = ReturnType<typeof useDrill>;

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** The nav is sticky; the transport sits directly under it at every width. */
function useNavHeight() {
  const [h, setH] = useState(57);
  useEffect(() => {
    const nav = document.querySelector("body > header");
    if (!nav) return;
    const measure = () => setH(Math.round(nav.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  return h;
}

/** A callback ref plus the element's size, kept current by a ResizeObserver.
 *  A callback ref (not useRef) so it follows the element across the switch
 *  between the page and Big view. */
function useBox() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl as (el: HTMLElement | null) => void, box, el] as const;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function PracticeClient() {
  const d = useDrill();
  const { state, set, setState, scale, notes, resolution, gati, seconds, playing, index, toggle } = d;
  const [copied, setCopied] = useState(false);
  const [instrument, setInstrument] = useState<"keys" | "guitar">("keys");
  const [bigView, setBigView] = useState(false);
  const narrow = useMedia("(max-width: 639px)");
  const wide = useMedia("(min-width: 1024px)");
  const xl = useMedia("(min-width: 1280px)");
  const xxl = useMedia("(min-width: 1400px)");
  const navH = useNavHeight();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.key === "l") set("loop", !state.loop);
      if (e.key === "c") set("click", !state.click);
      if (e.key === "d") set("drone", !state.drone);
      if (e.key === "b") setBigView((v) => !v);
      /* [ and ] step round the circle of fifths: ] up a fifth, [ down one. */
      if (e.key === "]") setState((s) => ({ ...s, key: stepKey(s.key, 1) }));
      if (e.key === "[") setState((s) => ({ ...s, key: stepKey(s.key, -1) }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, setState, state.loop, state.click, state.drone, toggle]);

  const activeNote = d.activeNote;
  const activePc = activeNote ? pc(activeNote) : null;

  const copyLink = () => {
    navigator.clipboard?.writeText(d.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  /** Surprise me: a key, a six-note sound, a pattern and a grouping, at random. */
  const surprise = useCallback(() => {
    const pool = FAMILIES.filter(isSixNoteSound);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
    for (let tries = 0; tries < 20; tries++) {
      const key = pick(KEYS);
      const fam = pick(pool);
      const mode = fam.kind === "rotation" ? Math.floor(Math.random() * 6) : 0;
      if (buildScale(key, fam.id, mode).error) continue;
      const pattern = pick(PATTERNS).id;
      setState((s) => ({
        ...s, key, family: fam.id, mode, pattern,
        grouping: pick([3, 4, 5, 6, 7]), cell: pick([3, 4, 5]),
      }));
      return;
    }
  }, [setState]);

  /* The keyboard follows the drill's own range, so every sounding note has a
     key to light, in any key and at any number of octaves. */
  const range = useMemo(() => {
    const ms = notes.map(midi);
    if (!ms.length) return { start: 60, octaves: 2 };
    const lo = Math.min(...ms), hi = Math.max(...ms);
    const start = Math.floor(lo / 12) * 12;
    return { start, octaves: Math.max(2, Math.ceil((hi + 1 - start) / 12)) };
  }, [notes]);

  const tripHint = tripletHint(d.pattern.length, state.sub, d.meter.top, state.grouping, state.resolve);

  /* Big view: the whole screen for what moves. Esc leaves it. */
  useEffect(() => {
    if (!bigView) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setBigView(false); };
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onEsc); document.body.style.overflow = prev; };
  }, [bigView]);

  /* ── layout: the staff takes whatever height is left ─────────────────────
     On a laptop or an iPad the transport, the choices, the staff, the chords
     and the keyboard all fit on one screen. The chords and keyboard have a
     fixed size, so the staff gets the rest and scrolls inside its own frame
     (it keeps the sounding note in view by itself). */
  const [lowerRef, lowerBox] = useBox();
  const [staffRef, , staffEl] = useBox();
  const [choicesRef, choicesBox] = useBox();
  const [instRef, instBox] = useBox();
  const [bigStaffRef, bigStaffBox] = useBox();
  const [staffMax, setStaffMax] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (bigView || !staffEl) return;
    const measure = () => {
      if (window.innerWidth < 640) { setStaffMax(undefined); return; }
      const top = staffEl.getBoundingClientRect().top + window.scrollY;
      // below the staff: a 12px gap, the chords and keyboard, the card's
      // bottom padding, and a little air before the fold
      const below = 12 + lowerBox.h + 16 + 14;
      setStaffMax(Math.max(170, Math.floor(window.innerHeight - top - below)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [bigView, staffEl, lowerBox.h, choicesBox.h, navH]);

  /* Chords beside the keyboard wherever there is room for both (1024px up,
     keys, up to two octaves); stacked otherwise. */
  const sideBySide = wide && instrument === "keys" && range.octaves <= 2;
  const whiteKeys = range.octaves * 7;
  const keyWidth = (big: boolean) => {
    if (sideBySide) return big ? (xxl ? 60 : xl ? 54 : 46) : (xxl ? 48 : xl ? 44 : 40);
    // stacked: fill the width, within reason
    const w = instBox.w || 600;
    return clamp(Math.floor(w / whiteKeys), 32, big ? 72 : 56);
  };

  const instrumentView = (big: boolean) => instrument === "keys" ? (
    <div className="mx-auto w-fit max-w-full">
      <Keyboard scale={scale.notes} removed={scale.removed}
                activeMidi={d.activeMidi} startMidi={range.start} octaves={range.octaves}
                height={big ? (narrow ? 130 : 150) : sideBySide ? 104 : narrow ? 104 : 120} showLabels keyWidth={keyWidth(big)}
                onNote={(m) => { void previewAudio([m]); }} />
    </div>
  ) : (
    <div className="overflow-x-auto">
      <Fretboard scale={scale.notes} removed={scale.removed} activePc={activePc}
                 onNote={(m) => { void previewAudio([m]); }} />
    </div>
  );

  /** The chords and the instrument: beside each other when there is room. */
  const lower = (big: boolean) => (
    <div ref={big ? undefined : lowerRef}
         className={sideBySide ? "grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3" : "space-y-3"}>
      <ChordStrip scale={scale} activePc={activePc} big={big && (xl || !sideBySide)} />
      <div ref={instRef} className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <Legend />
          <Seg value={instrument} ariaLabel="Instrument" small
               options={[{ label: "Keys", value: "keys" as const },
                         { label: "Guitar", value: "guitar" as const }]}
               onChange={setInstrument} />
        </div>
        {instrumentView(big)}
      </div>
    </div>
  );

  const phoneExtras = (
    <div className={`grid gap-1.5 sm:hidden ${bigView ? "grid-cols-2" : "grid-cols-[1fr_1fr_1.35fr]"}`}>
      <Toggle on={state.drone} onClick={() => set("drone", !state.drone)} className="!px-2"
              title="A soft tonic drone under the melody">
        Drone {state.drone ? "on" : "off"}
      </Toggle>
      <Toggle on={bigView} onClick={() => setBigView(!bigView)} className="!px-2">
        {bigView ? "Exit big view" : "Big view"}
      </Toggle>
      {!bigView && (
        <button className="btn btn-ghost whitespace-nowrap !px-2" onClick={surprise}
                title="A random key, sound, pattern and grouping">
          <span aria-hidden>⚄</span> Surprise me
        </button>
      )}
    </div>
  );

  const staff = (big: boolean, maxHeight: number | string | undefined) =>
    !scale.error && notes.length > 0 ? (
      <Notation notes={notes} subdivision={state.sub} grouping={state.grouping}
                meterId={state.meter} beatsPerBar={d.meter.top}
                keySignature={scale.keySignature} activeIndex={index}
                compact={narrow} fill maxHeight={maxHeight} />
    ) : big ? null : <p className="text-[15px] text-muted">{scale.error}</p>;

  if (bigView) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col gap-2.5 overflow-y-auto bg-bg px-3 pb-3 sm:px-5"
           role="dialog" aria-label="Big view">
        <Transport d={d} navH={0} bigView setBigView={setBigView} />
        {phoneExtras}
        <QuickBar d={d} narrow={narrow} big />
        <div ref={bigStaffRef}
             className={narrow ? "" : "flex min-h-[170px] flex-1 flex-col justify-center overflow-hidden"}>
          {staff(true, narrow ? "50dvh" : bigStaffBox.h || undefined)}
        </div>
        {lower(true)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Transport d={d} navH={navH} bigView={bigView} setBigView={setBigView} />

      {/* ── the scale, and the choices that matter most ─────────────────── */}
      <section ref={choicesRef} className="card space-y-3 !p-3 sm:!p-4" aria-label="The notes and the pattern">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="display text-3xl sm:text-4xl">{prettyKey(state.key)}</span>
              <span className="text-lg font-semibold text-cream sm:text-xl">{scale.label}</span>
            </h1>
            <p className="text-[15px] text-cream/75">
              {state.drone ? `Over a ${notePretty(scale.notes[0] ?? { letter: "G", alt: 0, octave: 4 })} drone. ` : ""}
              {scale.removed ? <>The missing note is <span className="font-semibold text-red-hi">{notePretty(scale.removed)}</span>.</> : null}
            </p>
          </div>
          <ScaleChips scale={scale} activePc={activePc} size={wide ? "md" : "sm"} />
          <button className="btn btn-ghost ml-auto hidden lg:inline-flex" onClick={surprise}
                  title="A random key, sound, pattern and grouping">
            <span aria-hidden>⚄</span> Surprise me
          </button>
        </div>
        {phoneExtras}
        <QuickBar d={d} narrow={narrow} onSurprise={surprise} />
      </section>

      {/* ── what moves: the staff, the chords, the instrument ─────────── */}
      <section className="card space-y-3 !p-3 sm:!p-4" aria-label="The drill">
        <div ref={staffRef}>
          {staff(false, narrow ? "min(340px, 46dvh)" : staffMax)}
        </div>
        {lower(false)}
      </section>

      <HowItWorks />

      {/* ── the rest of the settings ─────────────────────────────────── */}
      <Settings d={d} copied={copied} copyLink={copyLink} />

      <ResolutionBanner resolution={resolution} gati={gati} seconds={seconds}
                        bpm={state.bpm} playing={playing} hint={tripHint} />

      <Routines d={d} />

      <MoreAbout d={d} />

      <MidiPanel expected={notes} grouping={state.grouping}
                 stepDur={d.stepDur} playing={playing} position={d.position} />
    </div>
  );
}

/* ── the main choices, always at hand (also in big view) ──────────────── */

function QuickBar({ d, narrow, big = false, onSurprise }: {
  d: Drill; narrow: boolean; big?: boolean; onSurprise?: () => void;
}) {
  const { state, set, setState, scale } = d;
  const groups = useMemo(() => groupFamilies(FAMILIES), []);
  /* An old link can open on a family the menu no longer lists; show it
     anyway, so the menu never claims a different scale from the one playing. */
  const listed = groups.some((g) => g.families.some((f) => f.id === state.family));
  const isRotation = scale.family.kind === "rotation";
  const fam = patternFamilyOf(state.pattern);
  const pickFamily = (id: string) => {
    const f = PATTERN_FAMILIES.find((x) => x.id === id)!;
    if (!f.patterns.includes(state.pattern)) set("pattern", f.patterns[0]);
  };
  /* Labels sit above on a phone or an iPad in portrait, and beside the
     control from 1024px, where width is plenty and height is what runs out. */
  const lbl = "font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75 lg:w-[70px] lg:shrink-0";
  const row = "flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-0";
  return (
    <div className={`flex flex-col ${big ? "gap-2" : "gap-2.5"}`}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5 lg:gap-x-3 xl:gap-x-4">
        <div className={row}>
          <span className={lbl} id={big ? "key-label-big" : "key-label"}
                title="[ and ] step round the circle of fifths">Key</span>
          <KeyChips value={state.key} onChange={(k) => set("key", k)} size={big && !narrow ? "sm" : "md"} />
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:gap-3">
          <InsideLabel id={big ? "fam-big" : "fam"} label="Scale">
            <select id={big ? "fam-big" : "fam"} className="sel sm:w-[240px] lg:w-[210px] xl:w-[240px]" style={{ paddingLeft: 70 }}
                    value={state.family}
                    onChange={(e) => setState((s) => ({ ...s, family: e.target.value, mode: 0 }))}>
              {groups.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.families.map((f) => <option key={f.id} value={f.id}>{f.short}</option>)}
                </optgroup>
              ))}
              {!listed && (
                <optgroup label="Other">
                  <option value={state.family}>{scale.family.short}</option>
                </optgroup>
              )}
            </select>
          </InsideLabel>
          {isRotation && (
            /* the degrees are already under the note chips, so the mode menu
               only needs the name */
            <InsideLabel id={big ? "mode-big" : "mode"} label="Mode">
              <select id={big ? "mode-big" : "mode"} className="sel sm:w-[250px] lg:w-[240px] xl:w-[250px]" style={{ paddingLeft: 64 }}
                      value={state.mode}
                      onChange={(e) => set("mode", Number(e.target.value))}>
                {DIATONIC_MODES.map((m) => (
                  <option key={m.index} value={m.index}>{m.name}</option>))}
              </select>
            </InsideLabel>
          )}
        </div>
        {/* an iPad in portrait: Surprise me sits here, beside the menus */}
        {onSurprise && (
          <button className="btn btn-ghost hidden sm:inline-flex lg:hidden" onClick={onSurprise}
                  title="A random key, sound, pattern and grouping">
            <span aria-hidden>⚄</span> Surprise me
          </button>
        )}
      </div>
      <div className={row}>
        <span className={lbl}>Pattern</span>
        <div className="flex flex-wrap items-center gap-1.5" >
          <div className="contents" role="radiogroup" aria-label="Pattern">
            {PATTERN_FAMILIES.map((f) => {
              const on = f.id === fam.id;
              return (
                <button key={f.id} role="radio" aria-checked={on} onClick={() => pickFamily(f.id)}
                        title={f.trains}
                        className={`rounded-lg border px-2.5 py-1.5 text-[15px] font-semibold transition-colors sm:px-3 ${
                          on ? "border-cream bg-cream text-bg" : "border-line bg-surface2 text-cream/85 hover:border-[#4A4240]"}`}>
                  {f.name}
                </button>
              );
            })}
          </div>
          {fam.patterns.length > 1 && (
            <span className="sm:ml-2">
              <Seg value={state.pattern} ariaLabel="Direction"
                   options={fam.patterns.map((id) => ({
                     label: PATTERNS.find((p) => p.id === id)!.variant, value: id as PatternId,
                   }))}
                   onChange={(v) => set("pattern", v)} />
            </span>
          )}
        </div>
      </div>
      {state.family === "custom" && !big && (
        <div className="field">
          <label>Your notes</label>
          <CustomBuilder code={state.custom} scale={scale} onChange={(c) => set("custom", c)} />
        </div>
      )}
    </div>
  );
}

/** A select with its label drawn inside the box, on the left: one row high. */
function InsideLabel({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={id}
             className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[13px] uppercase tracking-[0.08em] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── chords in the scale, live: the ones that hold the sounding note light ─ */

function ChordStrip({ scale, activePc, big = false }: {
  scale: ReturnType<typeof useDrill>["scale"]; activePc: number | null; big?: boolean;
}) {
  const [size, setSize] = useState<3 | 4>(3);
  const chords = useMemo(
    () => (scale.error ? [] : tertianOnly(findChords(scale.notes, [size]))),
    [scale, size],
  );
  if (scale.error) return null;
  const tonic = scale.notes[0];
  return (
    <div className="well !p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p className="min-w-0 text-[15px] text-cream/75">
          <span className="font-semibold text-cream">Chords in this scale.</span>{" "}
          <span className="lg:hidden 2xl:inline">Bright ones hold the sounding note.</span>
        </p>
        <Seg value={size} ariaLabel="Chord size" small
             options={[{ label: "Triads", value: 3 as const }, { label: "Sevenths", value: 4 as const }]}
             onChange={setSize} />
      </div>
      {chords.length === 0 ? (
        <p className="text-[15px] text-muted">
          {size === 4 ? "No four-note chord stacked in thirds fits inside this scale." : "No triad fits inside this scale."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {(["tonic", "predominant", "dominant"] as HarmonicFunction[]).map((fn) => {
            const group = chords.filter((c) => tonic && harmonicFunction(tonic, c.names[0].voicing[0]) === fn);
            return (
              <div key={fn} className="min-w-0">
                <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
                  {FUNCTION_LABEL[fn]}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {group.length === 0 && <span className="py-1.5 text-[13px] text-muted">none here</span>}
                  {group.map((c, i) => {
                    const fits = activePc !== null && c.pcs.includes(activePc);
                    const name = c.names[0];
                    const [r, t, f5] = name.voicing;
                    const roman = size === 3 && tonic ? romanNumeral(tonic, r, triadQuality(r, t, f5)) : null;
                    return (
                      <button key={i} type="button" onClick={() => { void previewAudio(name.voicing.map(midi)); }}
                              title="Tap to hear it"
                              className={`rounded-lg border text-left transition-colors duration-75 ${big ? "px-3.5 py-2" : "px-2.5 py-1"} ${
                                fits ? "border-cream bg-cream text-bg" : "border-line bg-surface2 text-cream hover:border-[#4A4240]"}`}>
                        <span className={`flex items-baseline gap-1.5 font-bold ${big ? "text-[20px]" : "text-[16px]"}`}>
                          {roman && <span className={`font-serif font-normal italic ${fits ? "text-bg/70" : "text-cream/70"}`}>{roman}</span>}
                          {c.names.map((x) => prettyChord(x.symbol)).join(" = ")}
                        </span>
                        <span className={`block font-mono text-[13px] ${fits ? "text-bg/75" : "text-muted"}`}>
                          {name.notes.map((n) => n.replace("#", "♯").replace(/b$/, "♭")).join(" ")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** G#m7b5 → G♯m7♭5, Ebdim → E♭°. */
function prettyChord(sym: string): string {
  return sym.replace(/^([A-G])#/, "$1♯").replace(/^([A-G])b/, "$1♭")
    .replace("dim7", "°7").replace("dim", "°").replace("m7b5", "m7♭5").replace("#5", "♯5");
}

/* ── how the page is organised: one line, open it for the detail ──────── */

function HowItWorks() {
  const steps = [
    ["The notes", "Key, scale and mode, at the top. That's what you practise."],
    ["The pattern", "The shape you move through those notes: runs, fourths, thirds, sequences, broken chords, doubled notes."],
    ["The rhythm", "How many notes to a beat and where the accent falls. The bar counter shows where it lands on the one."],
    ["Routines", "Ready-made plans below. Tap a step and it sets everything for you."],
  ];
  return (
    <details className="group rounded-2xl border border-line px-4 py-2.5" aria-label="How Practice works">
      <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] text-cream/75">
        <span className="inline-block text-muted transition-transform group-open:rotate-90" aria-hidden>▸</span>
        <span>
          <span className="font-semibold text-cream">How Practice works:</span>{" "}
          pick the notes, then a pattern, then a rhythm. Routines set all three for you.
        </span>
      </summary>
      <ol className="mt-3 grid gap-x-6 gap-y-2 pb-1 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([t, w], i) => (
          <li key={t} className="text-[15px] leading-relaxed text-cream/75">
            <span className="num mr-1.5 text-muted">{i + 1}</span>
            <span className="font-semibold text-cream">{t}.</span> {w}
          </li>
        ))}
      </ol>
    </details>
  );
}

/* ── the transport: always visible, under the nav ─────────────────────── */

function Transport({
  d, navH, bigView, setBigView,
}: { d: Drill; navH: number; bigView: boolean; setBigView: (v: boolean) => void }) {
  const { state, set, playing, position: pos, countdown, resolution } = d;
  const beats = pos?.beats ?? d.meter.top;
  const bars = pos?.bars ?? resolution.bars;
  const counting = playing && !pos && countdown > 0;
  const note = d.activeNote ? notePretty(d.activeNote) : null;
  const beat = pos?.beat ?? (counting ? beats - countdown + 1 : 0);

  return (
    <div className="no-print sticky z-40 -mx-2 sm:-mx-3" style={{ top: navH + 6 }}>
      <div className="flex items-center gap-x-2 rounded-2xl border border-line bg-[#14120F]/95 px-2 py-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:gap-x-5 sm:px-4">
        <button className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[80px] px-3 py-2.5 text-base tracking-wider sm:min-w-[112px]`}
                onClick={d.toggle} aria-keyshortcuts="Space">
          {d.loadingAudio ? "STARTING…" : playing ? "STOP" : "PLAY"}
        </button>

        {/* the big number: the count-in, then the sounding note */}
        <div className="flex h-11 min-w-[46px] items-center justify-center sm:min-w-[64px]" aria-live="off">
          {counting ? (
            <span className="num text-[40px] leading-none text-gold" aria-label={`count in ${countdown}`}>{countdown}</span>
          ) : note ? (
            <span className="text-[32px] font-bold leading-none text-gold sm:text-[38px]">{note}</span>
          ) : (
            <span className="text-[32px] font-bold leading-none text-cream/25 sm:text-[38px]">—</span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="whitespace-nowrap font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
            {counting ? "Count in" : (
              <>Bar <span className="text-[16px] font-bold text-cream">{pos ? pos.bar : "–"}</span> of {bars}</>
            )}
            {pos?.pending && (
              <span className="ml-2 hidden normal-case tracking-normal text-cream/80 sm:inline lg:hidden">· new setting next bar</span>
            )}
          </span>
          <BeatDots n={beats} beat={beat} live={!!pos || counting} />
        </div>

        <p className="hidden min-w-[180px] text-[15px] leading-snug text-cream/75 lg:block">
          {pos && d.landsIn !== null
            ? d.landsIn <= beats
              ? <span className="font-semibold text-cream">Lands on the one in {d.landsIn} {d.landsIn === 1 ? "beat" : "beats"}</span>
              : <>Lands on the one in {d.landsIn} beats</>
            : `Lands on the one after ${resolution.bars} ${resolution.bars === 1 ? "bar" : "bars"}`}
          {pos?.pending && <span className="block font-mono text-[13px] text-muted">new setting from the next bar</span>}
        </p>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button className="btn btn-ghost px-2 py-2 sm:px-3" aria-label="Slower"
                  onClick={() => set("bpm", Math.max(40, state.bpm - 4))}>−</button>
          <span className="flex min-w-[38px] flex-col items-center">
            <span className="num text-xl leading-none text-cream">{state.bpm}</span>
            <span className="font-mono text-[13px] uppercase text-muted">bpm</span>
          </span>
          <button className="btn btn-ghost px-2 py-2 sm:px-3" aria-label="Faster"
                  onClick={() => set("bpm", Math.min(200, state.bpm + 4))}>+</button>
        </div>
        <span className="hidden sm:contents">
          <Toggle on={state.drone} onClick={() => set("drone", !state.drone)}
                  title="A soft tonic drone under the melody, so you hear each mode's colour">
            Drone {state.drone ? "on" : "off"}
          </Toggle>
          <Toggle on={bigView} onClick={() => setBigView(!bigView)}
                  title={bigView ? "Back to the full page (Esc)" : "Fill the screen with the staff, the chords and the keyboard (B)"}>
            {bigView ? "Exit big view" : "Big view"}
          </Toggle>
        </span>
      </div>
    </div>
  );
}

/** One dot per beat; the one gets a ring. Past eight beats (the long talas)
 *  the dots would not fit a phone, so the count is written out instead. */
function BeatDots({ n, beat, live }: { n: number; beat: number; live: boolean }) {
  if (n > 8) {
    return (
      <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
        Beat <span className={`text-[16px] font-bold ${live && beat ? "text-gold" : "text-cream"}`}>{live && beat ? beat : "–"}</span> of {n}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const on = live && beat === i + 1;
        const one = i === 0;
        return (
          <i key={i}
             className={`inline-block rounded-full ${one ? "h-4 w-4 sm:h-[18px] sm:w-[18px]" : "h-2.5 w-2.5 sm:h-3 sm:w-3"} ${
               on ? "bg-gold" : live ? "bg-cream/25" : "bg-cream/15"} ${
               one ? "ring-1 ring-cream/50 ring-offset-2 ring-offset-[#14120F]" : ""}`} />
        );
      })}
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[13px] text-muted">
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />sounding now</span>
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-red align-middle" />missing note</span>
      <span>&gt; accent</span>
    </div>
  );
}

/* ── settings: the notes and pattern, the rhythm, the sound ───────────── */

function Settings({ d, copied, copyLink }: { d: Drill; copied: boolean; copyLink: () => void }) {
  const [tab, setTab] = useState<"pattern" | "rhythm" | "sound">("pattern");
  const tabs = [["pattern", "Pattern"], ["rhythm", "Rhythm"], ["sound", "Sound"]] as const;
  return (
    <section className="card !p-3 sm:!p-5" aria-label="More settings">
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface2 p-1 lg:hidden"
           role="tablist" aria-label="Settings">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-1 py-2 text-[15px] font-bold transition ${
                    tab === t ? "bg-cream text-bg" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr_0.9fr] lg:gap-0 lg:divide-x lg:divide-line">
        <div className={`${tab === "pattern" ? "" : "hidden"} space-y-3 lg:block lg:pr-6`}>
          <PatternControls d={d} />
        </div>
        <div className={`${tab === "rhythm" ? "" : "hidden"} space-y-3 lg:block lg:px-6`}>
          <RhythmControls d={d} />
        </div>
        <div className={`${tab === "sound" ? "" : "hidden"} space-y-3 lg:block lg:pl-6`}>
          <SoundControls d={d} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-line pt-3">
        <button className="btn btn-ghost" onClick={copyLink}>
          {copied ? "✓ Link copied" : "Copy drill link"}
        </button>
        <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
        <span className="ml-auto hidden font-mono text-[13px] text-muted lg:inline">
          Space play · [ ] key · L loop · C click · D drone · B big view
        </span>
      </div>
      <p className="mt-2 text-[15px] text-cream/75 empty:hidden" role="status" aria-live="polite">
        {d.loadingAudio ? "Starting the audio…"
          : d.audioReady ? "" : "Playback starts at once while the piano samples load."}
      </p>
      {d.audioError && <p className="mt-1 text-[15px] text-amber" role="alert">Audio: {d.audioError}</p>}
    </section>
  );
}

/* ── more about this scale ────────────────────────────────────────────── */

function MoreAbout({ d }: { d: Drill }) {
  const { scale, state } = d;
  const ragas = useMemo(() => ragasForScale(state.key, scale.notes), [state.key, scale.notes]);
  if (scale.error) return null;
  const familyNote = scale.family.kind === "rotation" ? scale.family.note : null;
  return (
    <details className="card group !py-3">
      <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] font-semibold text-cream">
        <span className="inline-block text-muted transition-transform group-open:rotate-90" aria-hidden>▸</span>
        More about this scale
      </summary>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3 text-[15px] leading-relaxed text-cream/80">
          <p className="font-mono text-[14px] text-cream">
            {scale.degrees.map(prettyDegree).join("  ")}
          </p>
          {scale.teaching && <p>{scale.teaching}</p>}
          {familyNote && <p>{familyNote}</p>}
          {scale.aka.length > 0 && (
            <p><span className="text-muted">Also called: </span>{scale.aka.join(" · ")}</p>
          )}
          <p>
            <span className="text-muted">Tritones: </span>
            {scale.tritones === 0 ? "none" : scale.tritones}
            <span className="text-muted"> · Set class </span>{scale.forte}
          </p>
          {ragas.map((r) => (
            <p key={r.id}>
              <span className="text-muted">Carnatic raga with these notes: </span>
              <span className="font-semibold text-cream">{r.name}</span>. {r.note}
            </p>
          ))}
        </div>
        <div className="hidden justify-center lg:flex">
          <ScaleRing notes={scale.notes} removed={scale.removed}
                     activePc={d.activeNote ? pc(d.activeNote) : null} size={200} />
        </div>
      </div>
    </details>
  );
}

/* ── settings panels ──────────────────────────────────────────────────── */

function PatternControls({ d }: { d: Drill }) {
  const { state, set, setState, scale } = d;
  const fam = patternFamilyOf(state.pattern);
  const def = d.patternDef;
  const skipLine = state.pattern === "fourths" ? describeSkip(scale.notes, 3)
    : state.pattern === "thirds" ? describeSkip(scale.notes, 2) : "";
  const cost = def.usesTopNote && state.includeTop
    ? topNoteCost(d.pattern.length, state.sub, d.meter.top, state.grouping, state.resolve) : null;
  const cells = state.cell === 6 ? [3, 4, 5, 6] : [3, 4, 5];

  return (
    <>
      <p className="eyebrow !text-cream/75">The notes and the pattern</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="field">
          <label>Octaves</label>
          <Seg value={state.octaves} ariaLabel="Octaves"
               options={[1, 2, 3].map((v) => ({ label: String(v), value: v }))}
               onChange={(v) => set("octaves", v)} />
        </div>
        {def.usesCell && (
          <div className="field">
            <label>Notes per cell</label>
            <Seg value={state.cell} ariaLabel="Notes per cell"
                 options={cells.map((v) => ({ label: String(v), value: v }))}
                 onChange={(v) => set("cell", v)} />
          </div>
        )}
        {def.usesTopNote && (
          <div className="field">
            <label>Top note</label>
            <Toggle on={state.includeTop}
                    onClick={() => setState((s) => ({ ...s, includeTop: !s.includeTop }))}>
              {state.includeTop ? "Included" : "Left out"}
            </Toggle>
          </div>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-cream/75">
        <span className="font-semibold text-cream">{fam.name}.</span> {fam.trains} {skipLine}
      </p>
      {cost && (
        <p className="rounded-xl border border-amber/40 bg-amber/[0.08] px-3.5 py-2.5 text-[15px] text-amber">
          With the top note the pattern is {cost.length} notes long, so it takes {cost.withTop}{" "}
          {cost.withTop === 1 ? "bar" : "bars"} to land on the one instead of {cost.without}.
        </p>
      )}
    </>
  );
}

function RhythmControls({ d }: { d: Drill }) {
  const { state, set } = d;
  const g = groupingLabel(state.grouping, gatiFor(state.grouping));
  return (
    <>
      <p className="eyebrow !text-cream/75">The rhythm</p>
      <div className="field">
        <label>Accent every</label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Accent grouping">
          {GROUPINGS.map((n) => {
            const on = state.grouping === n;
            const trad = gatiFor(n)?.name?.toLowerCase();
            return (
              <button key={n} role="radio" aria-checked={on} onClick={() => set("grouping", n)}
                      className={`min-w-[52px] rounded-xl border px-2.5 py-1 text-center transition-colors ${
                        on ? "border-cream/70 bg-cream/[0.08]" : "border-line bg-surface2 hover:border-[#4A4240]"}`}>
                <span className="num block text-lg leading-tight text-cream">{n}</span>
                <span className="block font-mono text-[13px] leading-tight text-muted">{trad ?? " "}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[15px] text-cream/80">
          {g.plain}{g.trad && <span className="text-muted"> · {g.trad}</span>}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="sub">Notes per beat</label>
          <select id="sub" className="sel" value={state.sub}
                  onChange={(e) => set("sub", Number(e.target.value))}>
            {SUBDIVISIONS.map((s) => <option key={s.value} value={s.value}>{s.value} · {s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="meter">Time signature</label>
          <select id="meter" className="sel" value={state.meter}
                  onChange={(e) => set("meter", e.target.value)}>
            <optgroup label="Simple">
              {METERS.filter((m) => m.family === "simple")
                .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
            <optgroup label="Compound">
              {METERS.filter((m) => m.family === "compound")
                .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
            <optgroup label="Odd">
              {METERS.filter((m) => m.family === "odd")
                .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
            <optgroup label="Carnatic talas">
              {saptaTalaMeters().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
          </select>
        </div>
      </div>
      {d.meter.note && <p className="text-[15px] text-cream/75">{d.meter.note}</p>}
      <div className="field">
        <label>The cycle ends when</label>
        <Seg value={state.resolve} ariaLabel="When the cycle ends"
             options={[{ label: "notes and accent land", value: "full" as const },
                       { label: "the accent lands", value: "accent" as const }]}
             onChange={(v) => set("resolve", v)} />
      </div>
    </>
  );
}

function SoundControls({ d }: { d: Drill }) {
  const { state, set } = d;
  return (
    <>
      <p className="eyebrow !text-cream/75">The sound</p>
      <div className="field">
        <label htmlFor="bpm">Tempo · {state.bpm} bpm</label>
        <input id="bpm" type="range" min={40} max={200} value={state.bpm}
               onChange={(e) => set("bpm", Number(e.target.value))} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Toggle on={state.drone} onClick={() => set("drone", !state.drone)}>Drone</Toggle>
        <Toggle on={state.click} onClick={() => set("click", !state.click)}>Click</Toggle>
        <Toggle on={state.loop} onClick={() => set("loop", !state.loop)}>Loop</Toggle>
        <Toggle on={state.countIn} onClick={() => set("countIn", !state.countIn)}
                title="One bar of clicks before the drill starts">Count-in</Toggle>
        {state.sub === 2 && (
          <Toggle on={state.swing} onClick={() => set("swing", !state.swing)}
                  title="Offbeat 8ths land a triplet late">Swing</Toggle>
        )}
      </div>
    </>
  );
}

/* ── routines: the graded ladder ──────────────────────────────────────── */

function Routines({ d }: { d: Drill }) {
  const { state, setState } = d;
  const [speed, setSpeed] = useState(1);
  const bpm = SPEEDS.find((s) => s.id === speed)!.bpm;
  const apply = (partial: Partial<DrillState>) => {
    setState((s) => ({ ...s, ...partial }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const isOn = (partial: Partial<DrillState>) =>
    (Object.keys(partial) as (keyof DrillState)[]).every((k) => state[k] === partial[k]);

  return (
    <section id="routines" className="card !p-3 sm:!p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl sm:text-3xl">Routines</h2>
          <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-cream/75">
            Ready-made ladders for the scale you picked, easiest first. Tap a step and it sets
            the pattern and rhythm; play it at the first speed, then double, then double again.
          </p>
        </div>
        <div className="field">
          <label>Speed</label>
          <Seg value={speed} ariaLabel="Routine speed"
               options={SPEEDS.map((s) => ({ label: `${s.label} · ${s.bpm}`, value: s.id }))}
               onChange={(v) => {
                 setSpeed(v);
                 setState((s) => ({ ...s, bpm: SPEEDS.find((x) => x.id === v)!.bpm }));
               }} />
        </div>
      </div>
      <ol className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {ROUTINES.map((r, i) => (
          <li key={r.id} className="well !p-3">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="num text-lg text-muted">{i + 1}</span>
              <span className="text-[17px] font-semibold text-cream">{r.name}</span>
              <span className="font-mono text-[13px] text-muted">· {r.trad}</span>
            </p>
            <p className="mt-0.5 text-[15px] leading-relaxed text-cream/75">{r.what}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.steps.map((st) => {
                const next = stepState(st, bpm);
                const on = isOn(next);
                return (
                  <button key={st.label} onClick={() => apply(next)} aria-pressed={on}
                          className={`rounded-lg border px-3 py-1.5 text-[15px] transition-colors ${
                            on ? "border-cream/70 bg-cream/[0.08] text-cream"
                               : "border-line bg-surface2 text-cream/85 hover:border-[#4A4240]"}`}>
                    {st.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
