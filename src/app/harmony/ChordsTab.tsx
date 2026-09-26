"use client";

/**
 * Chords in the scale. Every sentence on this tab is computed from the chord
 * table for the scale on screen, in any key and any mode. Nothing here is
 * written for one mode and left standing for the others.
 *
 * The page is built around one piano. Whatever you touch — a triad, an
 * inversion, a two-name chord, a suspended stack, a branch of a chord tree —
 * lights on it, and gold means it is sounding now. Red is only the missing note.
 *
 * Colour for what a chord DOES (never gold, never red):
 *   tonic teal-green · pre-dominant blue · dominant rose · suspended stone.
 * Each clears 7:1 on the card surface.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Keyboard from "@/components/Keyboard";
import {
  ChordSet, chordsUnderEachNote, findChords, lostTriads, stackInThirds, susQuartal, tertianOnly,
} from "@/lib/theory/chords";
import { letterIndex, midi, note, Note, notePretty, pc } from "@/lib/theory/note";
import { prettyChordSymbol } from "@/lib/theory/movement";
import { previewAudio } from "@/lib/audio/engine";
import { playableStack } from "@/lib/audio/voicing";
import { cap, chordRole, count, list, optionById, ownSpellingFirst, PROSE, ScalePicker, stackLine } from "./scaleOptions";
import {
  FUNCTION_LABEL, FUNCTION_LINE, HarmonicFunction, harmonicFunction, romanNumeral, triadQuality,
} from "@/lib/theory/functions";

/* ── the function colours ──────────────────────────────────────────────── */

type Fn = HarmonicFunction | "open";
const FN_COLOR: Record<Fn, string> = {
  tonic: "#79C2A5",
  predominant: "#8AAEE0",
  dominant: "#D897B0",
  open: "#B5AB9D",
};
const FN_SHORT: Record<Fn, string> = {
  tonic: "home",
  predominant: "leads away",
  dominant: "pulls home",
  open: "no 3rd, floating",
};
const FN_NAME: Record<Fn, string> = { ...FUNCTION_LABEL, open: "Suspended" };
const FUNCTIONS: HarmonicFunction[] = ["tonic", "predominant", "dominant"];
/** The narrowest a triad card gets, px. */
const CARD_MIN = 200;
/** A hex colour at a low alpha, for tints. */
const tint = (hex: string, a: number) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

/** Chord symbols for display: ♭ ♯ °, and the fourth stacks named in words. */
const chordName = (symbol: string) =>
  prettyChordSymbol(symbol).replace(/#(\d)/g, "♯$1").replace(/b(\d)/g, "♭$1")
    .replace(/dim$/, "°").replace(/quartal4$/, " in 4ths").replace(/quartal$/, " in 4ths");
const pn = (name: string) => notePretty(noteOf(name));

const INVERSIONS = ["Root position", "1st inversion", "2nd inversion", "3rd inversion"];
const INTERVAL: Record<number, string> = {
  1: "♭2", 2: "2nd", 3: "♭3", 4: "3rd", 5: "4th", 6: "♭5", 7: "5th", 8: "♭6", 9: "6th", 10: "♭7", 11: "7th",
};

/** Close position, then each inversion: move the bottom note up an octave. */
function inversion(voicing: Note[], k: number): number[] {
  const ms = voicing.map(midi);
  for (let i = 0; i < k; i++) ms.push(ms.shift()! + 12);
  return ms;
}

/** True while exactly this voicing (in any octave shift) is the one sounding. */
const soundingNow = (lit: number[] | null, voicing: number[]) =>
  !!lit && lit.length === voicing.length && lit.every((m, i) => (((m - voicing[i]) % 12) + 12) % 12 === 0);

type Sound = (label: string, midis: number[], spread?: number) => void;

export default function ChordsTab() {
  const [key, setKey] = useState("G");
  const [optionId, setOptionId] = useState("d0");
  const scale = useMemo(() => optionById(optionId).build(key), [optionId, key]);
  const notes = scale.notes;

  /* One piano for the whole page: `picked` marks a chord at rest, `lit` is sounding. */
  const [picked, setPicked] = useState<{ label: string; pcs: number[] } | null>(null);
  const [lit, setLit] = useState<number[] | null>(null);
  const [invOf, setInvOf] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setPicked(null); setLit(null); setInvOf({}); }, [key, optionId]);

  const sound: Sound = (label, midis, spread = 0.03) => {
    const ms = playableStack(midis);
    setPicked({ label, pcs: [...new Set(ms.map((m) => ((m % 12) + 12) % 12))] });
    setLit(ms);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLit(null), 1400);
    void previewAudio(ms, spread);
  };

  /* Symmetric chords lead with the name spelled in the scale's own notes. */
  const { chords, bySymbol } = useMemo(() => ownSpellingFirst(findChords(notes, [3, 4]), notes), [notes]);
  const tri = tertianOnly(chords.filter((c) => c.size === 3));
  const tet = tertianOnly(chords.filter((c) => c.size === 4));
  const sus = susQuartal(chords);
  const twoNamed = tet.filter((c) => c.names.length > 1);
  const oneNamed = tet.filter((c) => c.names.length === 1);
  const lost = useMemo(() => {
    if (!scale.removed) return [];
    const parent = [...notes, scale.removed].sort((a, b) => midi(a) - midi(b));
    return lostTriads(parent, notes);
  }, [notes, scale.removed]);
  const under = useMemo(() => chordsUnderEachNote(notes), [notes]);
  const tonic = notes[0];
  const fnOf = (root: string): HarmonicFunction => harmonicFunction(tonic, noteOf(root));
  const label = (c: ChordSet) => {
    const [r, t, f] = c.names[0].voicing;
    const deg = (letterIndex(r.letter) - letterIndex(tonic.letter) + 7) % 7;
    return { c, deg, roman: romanNumeral(tonic, r, triadQuality(r, t, f)), fn: harmonicFunction(tonic, r) };
  };
  const triFn = tonic ? tri.map(label).sort((a, b) => a.deg - b.deg) : [];
  const lostFn = tonic ? lost.map(label) : [];
  const stack = useMemo(() => stackInThirds(notes), [notes]);

  if (scale.error) return <p className="card text-amber">{scale.error}</p>;

  const lowest = notes.length ? Math.floor(Math.min(...notes.map(midi)) / 12) * 12 - 12 : 48;
  const groups = FUNCTIONS.map((fn) => ({
    fn, items: triFn.filter((t) => t.fn === fn), gone: lostFn.filter((t) => t.fn === fn),
  }));
  const removedName = scale.removed ? notePretty(scale.removed) : "";

  return (
    <div className="space-y-4">
      {/* ── the scale, on one piano that everything below lights ──────────
          On a laptop or iPad in landscape it stays pinned under the menu bar,
          so the chord you tap is always in view. */}
      <div className="lg:sticky lg:top-[59px] lg:z-30 lg:-mt-2 lg:bg-bg lg:pt-2">
      <section className="card !p-4 sm:!p-5 lg:grid lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:items-center lg:gap-6">
        <div className="space-y-3">
          <ScalePicker idPrefix="ch" keyName={key} setKey={setKey} optionId={optionId} setOption={setOptionId} />
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="font-mono text-[22px] leading-tight tracking-[0.04em] text-cream">
              {notes.map(notePretty).join(" ")}
            </p>
            {scale.removed && (
              <p className="text-[15px] text-cream/80">
                Missing <span className="font-semibold text-red-hi">{removedName}</span>
              </p>
            )}
          </div>
          <p className="min-h-[24px] text-[15px] leading-snug text-cream/80" aria-live="polite">
            {picked
              ? <>On the piano: <span className="font-semibold text-cream">{picked.label}</span></>
              : "Tap any chord below to hear it and see it here."}
          </p>
        </div>
        <div className="mt-3 min-w-0 space-y-2 lg:mt-0">
          <MainPiano notes={notes} removed={scale.removed} lit={lit} picked={picked?.pcs} lowest={lowest} />
          <Legend />
        </div>
      </section>
      </div>

      {/* ── triads, grouped by what they do ──────────────────────────── */}
      <section className="card">
        <Head title="Triads" n={tri.length} aside={<FunctionKey />}
              line={scale.removed && lost.length
                ? `${cap(count(tri.length))} three-note chords live in this scale, grouped by what they do. ${list(lost.map((c) => chordName(c.names[0].symbol)))} ${lost.length === 1 ? "is" : "are"} gone: ${lost.length === 1 ? "it" : "each one"} needed ${removedName}.`
                : `${cap(count(tri.length))} three-note chords live in this scale, grouped by what they do.`} />

        {/* Tonic, pre-dominant, dominant, left to right as they move. Each group
            is as wide as its chords need; an empty one shrinks to a slim note. */}
        <div className="mt-4 flex flex-wrap items-start gap-3 lg:flex-nowrap">
          {groups.map((g) => {
            const c = FN_COLOR[g.fn];
            const n = g.items.length;
            if (!n) return (
              <p key={g.fn} style={{ flex: "1 1 150px", borderColor: tint(c, 0.45) }}
                 className="min-w-0 rounded-xl border border-dashed px-3 py-2.5 text-[14px] leading-snug text-cream/75">
                <span className="font-semibold" style={{ color: c }}>{FUNCTION_LABEL[g.fn]}</span>
                {": none in this scale"}
                {g.gone.length > 0 && scale.removed ? (
                  <>. {list(g.gone.map((x) => `${x.roman} (${chordName(x.c.names[0].symbol)})`))} would need{" "}
                    <span className="font-semibold text-red-hi">{removedName}</span>.</>
                ) : "."}
              </p>
            );
            return (
              <div key={g.fn} style={{ flex: `${n} 1 ${n * CARD_MIN + (n - 1) * 8 + 26}px`, borderTopColor: c,
                                       background: `linear-gradient(180deg, ${tint(c, 0.07)}, transparent 60%)` }}
                   className="min-w-0 self-stretch rounded-xl border border-line border-t-2 p-2.5 sm:p-3">
                <p className="flex flex-wrap items-baseline gap-x-2 px-0.5">
                  <span className="text-[16px] font-bold tracking-[-0.005em]" style={{ color: c }}>{FUNCTION_LABEL[g.fn]}</span>
                  <span className="text-[13px] text-muted">{FUNCTION_LINE[g.fn]}</span>
                </p>
                <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${CARD_MIN}px), 1fr))` }}>
                  {g.items.map(({ c: chord, roman }) => {
                    const first = chord.names[0];
                    const name = chordName(first.symbol);
                    return (
                      <TriadCard key={name} name={name} roman={roman} color={c} chord={chord}
                                 inv={invOf[name] ?? 0} lit={lit}
                                 onPick={(k) => {
                                   setInvOf((v) => ({ ...v, [name]: k }));
                                   sound(k ? `${roman} · ${name}, ${INVERSIONS[k].toLowerCase()}` : `${roman} · ${name}`, inversion(first.voicing, k));
                                 }} />
                    );
                  })}
                </div>
                {g.gone.length > 0 && scale.removed && (
                  <p className="mt-2 px-0.5 text-[13px] leading-snug text-muted">
                    Gone: {list(g.gone.map((x) => `${x.roman} ${chordName(x.c.names[0].symbol)}`))}, which
                    {g.gone.length === 1 ? " needs " : " need "}
                    <span className="font-semibold text-red-hi">{removedName}</span>.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── chord trees: every chord that fits under a melody note ───── */}
      <ChordTrees under={under} sound={sound} lit={lit} fnOf={fnOf} bySymbol={bySymbol} />

      {/* ── one set of notes, two names ──────────────────────────────── */}
      <section className="card">
        <Head title="Same notes, two names" n={twoNamed.length}
              line={twoNamed.length
                ? `${cap(count(twoNamed.length))} four-note ${twoNamed.length === 1 ? "chord has" : "chords have"} two correct names. The notes are identical; the bass note decides which name you hear.`
                : "No four-note chord in this scale has a second name."} />
        {twoNamed.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {twoNamed.map((c, i) => (
              <div key={i} className="well !p-3 sm:!p-4">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {c.names.map((n, j) => (
                    <span key={n.symbol} className="flex items-center gap-2.5">
                      {j > 0 && <span className="text-[20px] text-muted">=</span>}
                      <FnDot fn={fnOf(n.root)} />
                      <span className="text-[22px] font-bold leading-none tracking-[-0.015em] text-cream">{chordName(n.symbol)}</span>
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 font-mono text-[13px] text-cream/70">{c.noteNames.map(pn).join(" · ")}</p>
                <MiniKeys className="mt-2.5" voicing={c.names[0].voicing.map(midi)} lit={lit} />
                <p className="mt-2 text-[15px] leading-snug text-cream/80">
                  {c.names.map((n) => `${chordName(n.symbol)} if ${pn(n.root)} is in the bass`).join("; ")}.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {c.names.map((n) => (
                    <button key={n.symbol} className="btn btn-ghost !px-3 !py-1.5 text-[14px]"
                            onClick={() => sound(`${chordName(n.symbol)} (${pn(n.root)} in the bass)`, [midi(n.voicing[0]) - 12, ...n.voicing.map(midi)])}>
                      <PlayGlyph /> {chordName(n.symbol)}
                      <span className="font-mono text-[13px] text-muted">{pn(n.root)} bass</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {oneNamed.length > 0 && (
          <div className="mt-4">
            <p className="micro-caps">Other four-note chords</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {oneNamed.map((c, i) => {
                const n = c.names[0];
                const color = FN_COLOR[fnOf(n.root)];
                const on = soundingNow(lit, n.voicing.map(midi));
                return (
                  <button key={i} onClick={() => sound(chordName(n.symbol), n.voicing.map(midi))}
                          className={`chip border-t-2 text-left ${on ? "chip-lit" : ""}`}
                          style={on ? undefined : { borderTopColor: color }}>
                    <span className="block text-[16px] font-semibold leading-tight">{chordName(n.symbol)}</span>
                    <span className={`block font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-muted"}`}>{n.notes.map(pn).join(" ")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── suspended and fourth stacks, drawn as stacks ─────────────── */}
      <section className="card">
        <Head title="Suspended and fourths" n={sus.length}
              line={sus.length
                ? "Chords built from 2nds and 4ths instead of 3rds. No 3rd means no major or minor: open, floating, unresolved. Each stack reads bottom to top, with the gap between each pair of notes."
                : "None: this scale has no suspended or fourth-stacked chords."} />
        {sus.length > 0 && (
          <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))]">
            {sus.map((c, i) => <SusCard key={i} chord={c} sound={sound} lit={lit} />)}
          </div>
        )}
      </section>

      {/* ── the whole scale as one chord ─────────────────────────────── */}
      <section className="card">
        <Head title="Hear it as one chord" line={stackLine(stack, notes, scale.removed)} />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex flex-wrap gap-1.5">
            {stack.notes.map((n, i) => (
              <div key={i} className="well min-w-[50px] !rounded-lg !px-2.5 !py-1.5 text-center">
                <span className="block font-mono text-[19px] leading-tight text-cream">{notePretty(n)}</span>
                {stack.degrees[i] && <span className="block font-mono text-[13px] text-muted">{stack.degrees[i]}</span>}
              </div>
            ))}
          </div>
          <button className="btn btn-primary"
                  onClick={() => sound("the whole scale, stacked in thirds", stack.notes.map(midi), 0.09)}>
            <PlayGlyph /> Hear it as one chord
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────── */

/** The width of a box, kept current. Starts at 0 until measured. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.floor(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** The page's one piano, sized to fit its box: three octaves at any width. */
function MainPiano({ notes, removed, lit, picked, lowest }: {
  notes: Note[]; removed: Note | null; lit: number[] | null; picked?: number[]; lowest: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const kw = w ? clamp(Math.floor(w / 21), 11, 42) : 14;
  return (
    <div ref={ref} className="min-w-0">
      <Keyboard scale={notes} removed={removed} activeMidi={lit}
                chordTonePcs={picked} startMidi={lowest} octaves={3}
                height={clamp(Math.round(kw * 2.6), 72, 104)} showLabels={kw >= 22} keyWidth={kw}
                onNote={(m) => { void previewAudio([m]); }} />
    </div>
  );
}

const NONE: Note[] = [];

/** A small piano inside a card: the chord's notes marked, gold while it sounds.
 *  It shrinks its keys to fit the card, so it never spills out. */
function MiniKeys({ voicing, lit, small = false, className = "" }: {
  voicing: number[]; lit: number[] | null; small?: boolean; className?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const start = Math.floor(Math.min(...voicing) / 12) * 12;
  const octaves = Math.max(...voicing) - start >= 12 ? 2 : 1;
  const pref = small ? 16 : 19;
  const kw = w ? clamp(Math.floor(w / (octaves * 7)), 7, pref) : 8;
  return (
    <div ref={ref} className={`pointer-events-none min-w-0 ${className}`}>
      <Keyboard scale={NONE} removed={null} markMidi={voicing}
                activeMidi={soundingNow(lit, voicing) ? voicing : null} startMidi={start} octaves={octaves}
                height={small ? 44 : 52} keyWidth={kw} />
    </div>
  );
}

function Head({ title, n, line, aside }: { title: string; n?: number; line: string; aside?: ReactNode }) {
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="display text-[26px] leading-[1.05] tracking-[-0.025em] sm:text-[28px]">
          {title}
          {n !== undefined && (
            <span className="ml-2.5 inline-block translate-y-[-0.2em] rounded-full bg-white/[0.07] px-2 py-0.5 align-middle font-mono text-[13px] font-medium leading-normal tracking-normal tabular-nums text-cream/80">{n}</span>
          )}
        </h2>
        {aside}
      </div>
      <p className={`mt-1.5 ${PROSE}`}>{line}</p>
    </header>
  );
}

function FnDot({ fn }: { fn: Fn }) {
  return <i aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: FN_COLOR[fn] }} />;
}

/** The colour key for what a chord does. */
function FunctionKey() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label="Colour key">
      {(["tonic", "predominant", "dominant", "open"] as Fn[]).map((fn) => (
        <li key={fn} className="flex items-center gap-1.5">
          <FnDot fn={fn} />
          <span className="font-semibold" style={{ color: FN_COLOR[fn] }}>{FN_NAME[fn]}</span>
          <span className="hidden text-muted sm:inline">{FN_SHORT[fn]}</span>
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-muted">
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />sounding now</span>
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#8E7A2E] align-middle" />the chord you picked</span>
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-cream align-middle" />in the scale</span>
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-red align-middle" />the missing note</span>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg aria-hidden="true" width="10" height="11" viewBox="0 0 10 11" className="shrink-0">
      <path d="M1 1.2v8.6c0 .5.5.8.9.5l7-4.3c.4-.3.4-.8 0-1.1l-7-4.3C1.5.4 1 .7 1 1.2z" fill="currentColor" />
    </svg>
  );
}

/** A small segmented control. The picked segment is cream, not gold: gold is
 *  only for what is sounding. */
function Pills({ label, items, value, onPick }: {
  label: string; items: string[]; value: number; onPick: (i: number) => void;
}) {
  return (
    <div role="group" aria-label={label}
         className="inline-flex shrink-0 gap-0.5 rounded-lg border border-line-control bg-surface2 p-0.5">
      {items.map((t, i) => (
        <button key={t} type="button" aria-pressed={value === i} onClick={() => onPick(i)}
                className={`rounded-md px-2.5 py-1.5 font-mono text-[13px] leading-none transition-colors duration-150 ${
                  value === i ? "bg-cream font-semibold text-bg" : "text-muted hover:text-cream"}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ── a triad, with its inversions ────────────────────────────────────── */

function TriadCard({ name, roman, color, chord, inv, lit, onPick }: {
  name: string; roman: string; color: string; chord: ChordSet; inv: number; lit: number[] | null;
  onPick: (k: number) => void;
}) {
  const n = chord.names[0];
  return (
    <div className="well min-w-0 !p-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button className="min-w-0 rounded-md text-left" onClick={() => onPick(0)}>
          <span className="flex items-baseline gap-2">
            <span className="font-serif text-[22px] font-semibold italic leading-none" style={{ color }}>{roman}</span>
            <span className="text-[19px] font-bold leading-none tracking-[-0.01em] text-cream">{name}</span>
          </span>
          <span className="mt-1.5 block font-mono text-[13px] leading-none text-cream/70">
            {[...n.notes.slice(inv), ...n.notes.slice(0, inv)].map(pn).join(" · ")}
          </span>
        </button>
        <Pills label={`${name} inversion`} items={["Root", "1st", "2nd"]} value={inv} onPick={onPick} />
      </div>
      <MiniKeys small className="mt-2" voicing={inversion(n.voicing, inv)} lit={lit} />
    </div>
  );
}

/* ── a suspended chord, drawn as its stack ───────────────────────────── */

function SusCard({ chord, sound, lit }: { chord: ChordSet; sound: Sound; lit: number[] | null }) {
  const [i, setI] = useState(0);
  const n = chord.names[i % chord.names.length];
  const ms = n.voicing.map(midi);
  const gaps = ms.slice(1).map((m, k) => INTERVAL[(m - ms[k]) % 12] ?? "");
  const c = FN_COLOR.open;
  return (
    <div className="well min-w-0 border-t-2 !p-3" style={{ borderTopColor: tint(c, 0.7) }}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {chord.names.map((x, j) => (
          <button key={x.symbol} onClick={() => setI(j)} aria-pressed={j === i % chord.names.length}
                  className={`text-[17px] font-bold leading-tight tracking-[-0.01em] transition-colors ${
                    j === i % chord.names.length ? "text-cream" : "text-muted hover:text-cream/80"}`}>
            {j > 0 && <span className="mr-2 font-normal text-muted">=</span>}{chordName(x.symbol)}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex items-end gap-3">
        <div className="flex shrink-0 flex-col items-start">
          {n.notes.map((_, j) => {
            const k = n.notes.length - 1 - j; // draw from the top note down
            return (
              <div key={k} className="flex flex-col items-start">
                <span className={`grid h-6 w-10 place-items-center rounded-md border font-mono text-[14px] leading-none ${
                  k === 0 ? "border-cream/70 text-cream" : "border-line text-cream/85"}`}>{pn(n.notes[k])}</span>
                {k > 0 && (
                  <span className="flex h-4 items-center gap-1.5 pl-5">
                    <i className="h-full w-px bg-line" />
                    <span className="font-mono text-[13px] leading-none text-muted">{gaps[k - 1]}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <MiniKeys voicing={ms} lit={lit} />
          <button className="btn btn-ghost !px-3 !py-1.5 text-[14px]" onClick={() => sound(chordName(n.symbol), ms)}>
            <PlayGlyph /> {chordName(n.symbol)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── chord trees: the melody note in the middle, its chords on the branches ─ */

type Under = ReturnType<typeof chordsUnderEachNote>[number];

const ROLE_WORD: Record<string, string> = { root: "root", "3rd": "3rd", "5th": "5th", "6th": "6th", "7th": "7th" };
/** "F#m7 = A6" → "F#": the root of the first name. */
const rootOf = (symbol: string) => /^[A-G](?:##|#|bb|b)?/.exec(symbol)?.[0] ?? symbol[0];

function ChordTrees({ under, sound, lit, fnOf, bySymbol }: {
  under: Under[]; sound: Sound; lit: number[] | null; fnOf: (root: string) => HarmonicFunction;
  bySymbol: Map<string, ChordSet>;
}) {
  /* The names on a branch, led by the scale's own spelling, and the job the
     melody note does in the chord under that first name. */
  const rename = (sym: string) => bySymbol.get(sym)?.names.map((x) => x.symbol).join(" = ") ?? sym;
  const [sel, setSel] = useState(0);
  const [size, setSize] = useState(1);
  const [branch, setBranch] = useState<string | null>(null);
  useEffect(() => { setSel(0); setBranch(null); }, [under]);
  const d = under[Math.min(sel, under.length - 1)];
  if (!d) return null;
  const branches = d.under.filter((u) => size === 1 || u.voicing.length === 3);
  const melody = notePretty(d.note);
  const role = (u: Under["under"][number]) => {
    const c = bySymbol.get(u.symbol);
    return c ? chordRole(c.names[0].notes, pc(d.note)) : ROLE_WORD[u.role] ?? u.role;
  };
  const play = (u: Under["under"][number]) => {
    setBranch(u.symbol);
    sound(`${chordName(rename(u.symbol).split(" = ")[0])} under ${melody}`, u.voicing);
  };
  const chosen = branches.find((u) => u.symbol === branch);

  return (
    <section className="card">
      <Head title="Chord trees" n={branches.length}
            aside={<Pills label="Chord size" items={["Triads", "+ Sevenths"]} value={size} onPick={setSize} />}
            line={`Pick a melody note. Every chord of this scale that holds it grows out as a branch, voiced with your note on top; the small word is the job your note does. Colours show what each chord does. The idea behind our Chord Trees app, kept to this scale's own notes.`} />

      <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Melody note">
        {under.map((u, i) => (
          <button key={pc(u.note)} role="radio" aria-checked={i === sel}
                  onClick={() => { setSel(i); setBranch(null); void previewAudio([midi(u.note)]); }}
                  className={`min-w-0 flex-1 rounded-lg border px-1 py-1.5 font-mono text-[17px] transition-colors sm:min-w-[48px] sm:flex-none sm:px-3 ${
                    i === sel ? "border-cream bg-cream text-bg" : "border-line bg-surface2 text-cream hover:border-[#4A4240]"}`}>
            {notePretty(u.note)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-5 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[360px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#2A2523" strokeWidth="0.3" strokeDasharray="0.8 1.6" />
            {branches.map((u, i) => {
              const a = angle(i, branches.length);
              const on = soundingNow(lit, u.voicing) && branch === u.symbol;
              return (
                <line key={u.symbol} x1="50" y1="50" x2={50 + 36 * Math.cos(a)} y2={50 + 36 * Math.sin(a)}
                      stroke={on ? "#C9A227" : tint(FN_COLOR[fnOf(rootOf(rename(u.symbol)))], 0.55)}
                      strokeWidth={on ? 0.9 : 0.55} />
              );
            })}
          </svg>
          <div className="absolute left-1/2 top-1/2 grid h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-cream bg-surface2">
            <span className="text-center">
              <span className="block text-[28px] font-black leading-none text-cream">{melody}</span>
              <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">melody</span>
            </span>
          </div>
          {branches.map((u, i) => {
            const a = angle(i, branches.length);
            const on = soundingNow(lit, u.voicing) && branch === u.symbol;
            const picked = branch === u.symbol;
            const c = FN_COLOR[fnOf(rootOf(rename(u.symbol)))];
            return (
              <button key={u.symbol} onClick={() => play(u)}
                      style={{
                        left: `${50 + 38 * Math.cos(a)}%`, top: `${50 + 38 * Math.sin(a)}%`,
                        ...(on ? {} : { borderColor: picked ? "#F4EFE4" : tint(c, 0.6), borderTopColor: c }),
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-t-2 px-2 py-1 text-center transition-colors ${
                        on ? "border-gold bg-gold text-[#17130a]" : "bg-surface text-cream"}`}>
                <span className="block whitespace-nowrap text-[15px] font-bold leading-tight">{chordName(rename(u.symbol).split(" = ")[0])}</span>
                <span className={`block whitespace-nowrap font-mono text-[11px] ${on ? "text-[#2A2208]" : "text-muted"}`}>
                  {melody} = {role(u)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="min-h-[60px]">
            {chosen
              ? <MiniKeys voicing={chosen.voicing} lit={lit} />
              : <p className="micro pt-1">Tap a branch to hear it, with {melody} on top.</p>}
          </div>
          {branches.length === 0 && (
            <p className="text-[15px] text-cream/80">No chord of this scale contains {melody}. It works as a passing note.</p>
          )}
          {branches.map((u) => {
            const on = soundingNow(lit, u.voicing) && branch === u.symbol;
            const picked = branch === u.symbol;
            const c = FN_COLOR[fnOf(rootOf(rename(u.symbol)))];
            return (
              <button key={u.symbol} onClick={() => play(u)}
                      style={{ borderLeftColor: on ? "#C9A227" : c }}
                      className={`flex w-full items-baseline justify-between gap-4 rounded-lg border border-l-[3px] px-3.5 py-2 text-left transition-colors ${
                        on ? "border-gold/70 bg-gold/[0.10]" : picked ? "border-cream/50 bg-surface2" : "border-line bg-surface2 hover:border-[#4A4240]"}`}>
                <span className="text-[16px] font-semibold text-cream">
                  {rename(u.symbol).split(" = ").map(chordName).join(" = ")}
                </span>
                <span className="shrink-0 text-[14px] text-cream/75">
                  {melody} is the <span className="font-semibold text-cream">{role(u)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Branch angles: start at the top and go round, like the Chord Trees app. */
function angle(i: number, n: number): number {
  const deg = n <= 3 ? 270 + i * 120 : n === 4 ? [270, 0, 90, 180][i] : 270 + i * (360 / n);
  return (deg * Math.PI) / 180;
}

/** "F#" → a Note, only so notePretty can print ♯ and ♭. */
function noteOf(name: string): Note {
  const alt = ({ "": 0, "#": 1, "##": 2, b: -1, bb: -2 } as Record<string, number>)[name.slice(1)] ?? 0;
  return note(name[0] as Note["letter"], alt as Note["alt"], 4);
}
