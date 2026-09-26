"use client";

/**
 * Chords in the scale. Every sentence on this tab is computed from the chord
 * table for the scale on screen, in any key and any mode. Nothing here is
 * written for one mode and left standing for the others.
 *
 * The page is built around one piano. Whatever you touch — a triad, an
 * inversion, a two-name chord, a suspended stack, a branch of a chord tree —
 * lights on it, and gold means it is sounding now. Red is only the missing note.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "@/components/Keyboard";
import {
  ChordSet, chordsUnderEachNote, findChords, lostTriads, stackInThirds, susQuartal, tertianOnly,
  ThirdsStack,
} from "@/lib/theory/chords";
import { letterIndex, midi, note, Note, notePretty, pc } from "@/lib/theory/note";
import { prettyChordSymbol } from "@/lib/theory/movement";
import { previewAudio } from "@/lib/audio/engine";
import { playableStack } from "@/lib/audio/voicing";
import { optionById, PROSE, ScalePicker } from "./scaleOptions";
import {
  FUNCTION_LABEL, FUNCTION_LINE, HarmonicFunction, harmonicFunction, romanNumeral, triadQuality,
} from "@/lib/theory/functions";

/** Chord symbols for display: ♭ ♯ °, and the fourth stacks named in words. */
const chordName = (symbol: string) =>
  prettyChordSymbol(symbol).replace(/dim$/, "°").replace(/quartal4$/, " in 4ths").replace(/quartal$/, " in 4ths");
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => COUNT[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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

  const sound = (label: string, midis: number[], spread = 0.03) => {
    const ms = playableStack(midis);
    setPicked({ label, pcs: [...new Set(ms.map((m) => ((m % 12) + 12) % 12))] });
    setLit(ms);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLit(null), 1400);
    void previewAudio(ms, spread);
  };

  const chords = useMemo(() => findChords(notes, [3, 4]), [notes]);
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

  return (
    <div className="space-y-5">
      {/* ── the scale, on one piano that everything below lights ─────── */}
      <section className="card space-y-4">
        <ScalePicker idPrefix="ch" keyName={key} setKey={setKey} optionId={optionId} setOption={setOptionId} />
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="font-mono text-2xl tracking-wide text-cream">{notes.map(notePretty).join("  ")}</p>
          {scale.removed && (
            <p className="text-[15px] text-cream/80">
              Missing: <span className="font-semibold text-red-hi">{notePretty(scale.removed)}</span>
            </p>
          )}
          <p className="ml-auto min-h-6 font-mono text-[15px] text-cream" aria-live="polite">
            {picked ? <>On the piano: <span className="font-bold">{picked.label}</span></> : "Tap any chord below to see and hear it here."}
          </p>
        </div>
        <Keyboard scale={notes} removed={scale.removed} activeMidi={lit}
                  chordTonePcs={picked?.pcs} startMidi={lowest} octaves={3}
                  height={130} showLabels keyWidth={34}
                  onNote={(m) => { void previewAudio([m]); }} />
        <Legend />
      </section>

      {/* ── triads, grouped by what they do ──────────────────────────── */}
      <section className="card">
        <Head title="Triads" n={tri.length}
              line={scale.removed && lost.length
                ? `${cap(count(tri.length))} three-note chords live in this scale, grouped by what they do. ${list(lost.map((c) => chordName(c.names[0].symbol)))} ${lost.length === 1 ? "is" : "are"} gone: ${lost.length === 1 ? "it" : "each one"} needed ${notePretty(scale.removed)}.`
                : `${cap(count(tri.length))} three-note chords live in this scale, grouped by what they do.`} />
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(["tonic", "predominant", "dominant"] as HarmonicFunction[]).map((fn) => {
            const group = triFn.filter((t) => t.fn === fn);
            const gone = lostFn.filter((t) => t.fn === fn);
            return (
              <div key={fn} className="rounded-2xl border border-line p-3">
                <p className="px-1">
                  <span className="block text-[17px] font-bold text-cream">{FUNCTION_LABEL[fn]}</span>
                  <span className="block text-[13px] text-muted">{FUNCTION_LINE[fn]}</span>
                </p>
                <div className="mt-2.5 grid gap-2">
                  {group.length === 0 && (
                    <p className="px-1 text-[14px] leading-relaxed text-cream/75">
                      None in this scale{gone.length && scale.removed
                        ? `: ${list(gone.map((g) => `${g.roman} (${chordName(g.c.names[0].symbol)})`))} would need ${notePretty(scale.removed)}.`
                        : "."}
                    </p>
                  )}
                  {group.map(({ c, roman }) => {
                    const n = c.names[0];
                    const name = chordName(n.symbol);
                    const inv = invOf[name] ?? 0;
                    return (
                      <div key={name} className="well !p-3">
                        <div className="flex items-start justify-between gap-3">
                          <button className="text-left" onClick={() => { setInvOf((v) => ({ ...v, [name]: 0 })); sound(`${roman} · ${name}`, inversion(n.voicing, 0)); }}>
                            <span className="flex items-baseline gap-2">
                              <span className="font-serif text-[22px] italic leading-none text-cream/80">{roman}</span>
                              <span className="text-[20px] font-bold leading-none text-cream">{name}</span>
                            </span>
                            <span className="mt-1 block font-mono text-[13px] text-cream/70">
                              {[...n.notes.slice(inv), ...n.notes.slice(0, inv)].map(pn).join(" · ")}
                            </span>
                          </button>
                          <div className="seg shrink-0" role="group" aria-label={`${name} inversion`}>
                            {["Root", "1st", "2nd"].map((lbl, k) => (
                              <button key={lbl} type="button" data-on={inv === k}
                                      title={INVERSIONS[k]}
                                      onClick={() => { setInvOf((v) => ({ ...v, [name]: k })); sound(`${roman} · ${name}, ${INVERSIONS[k].toLowerCase()}`, inversion(n.voicing, k)); }}
                                      className="!px-2.5 !py-1 !text-[13px]">{lbl}</button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2"><MiniKeys small scale={notes} removed={scale.removed} voicing={inversion(n.voicing, inv)} lit={lit} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── chord trees: every chord that fits under a melody note ───── */}
      <ChordTrees under={under} sound={sound} scale={notes} removed={scale.removed} lit={lit} />

      {/* ── one set of notes, two names ──────────────────────────────── */}
      <section className="card">
        <Head title="Same notes, two names" n={twoNamed.length}
              line={twoNamed.length
                ? `${cap(count(twoNamed.length))} four-note ${twoNamed.length === 1 ? "chord has" : "chords have"} two correct names. The notes are identical; the bass note decides which name you hear.`
                : "No four-note chord in this scale has a second name."} />
        {twoNamed.length > 0 && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {twoNamed.map((c, i) => (
              <div key={i} className="well">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {c.names.map((n, j) => (
                    <span key={n.symbol} className="flex items-baseline gap-3">
                      {j > 0 && <span className="text-[22px] text-muted">=</span>}
                      <span className="text-[24px] font-bold text-cream">{chordName(n.symbol)}</span>
                    </span>
                  ))}
                </div>
                <p className="mt-1 font-mono text-[14px] text-cream/75">{c.noteNames.map(pn).join(" · ")}</p>
                <div className="mt-3"><MiniKeys scale={notes} removed={scale.removed} voicing={c.names[0].voicing.map(midi)} lit={lit} /></div>
                <p className="mt-2 text-[14px] text-cream/75">
                  {c.names.map((n) => `${chordName(n.symbol)} if ${pn(n.root)} is in the bass`).join("; ")}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.names.map((n) => (
                    <button key={n.symbol} className="btn btn-ghost !px-3.5 !py-2 text-[14px]"
                            onClick={() => sound(`${chordName(n.symbol)} (${pn(n.root)} in the bass)`, [midi(n.voicing[0]) - 12, ...n.voicing.map(midi)])}>
                      ▶ Hear it as {chordName(n.symbol)} <span className="ml-1 font-mono text-[12px] text-muted">{pn(n.root)} in the bass</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {oneNamed.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/70">Other four-note chords</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {oneNamed.map((c, i) => {
                const n = c.names[0];
                return (
                  <button key={i} className="chip text-left hover:border-cream/40"
                          onClick={() => sound(chordName(n.symbol), n.voicing.map(midi))}>
                    <span className="block text-[16px] font-semibold">{chordName(n.symbol)}</span>
                    <span className="block font-mono text-[13px] text-muted">{n.notes.map(pn).join(" ")}</span>
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
                ? "Chords built from 2nds and 4ths instead of 3rds. No 3rd means no major or minor: open, floating, unresolved. Each stack is drawn bottom to top with the gaps between its notes."
                : "None: this scale has no suspended or fourth-stacked chords."} />
        {sus.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sus.map((c, i) => <SusCard key={i} chord={c} sound={sound} scale={notes} removed={scale.removed} lit={lit} />)}
          </div>
        )}
      </section>

      {/* ── the whole scale as one chord ─────────────────────────────── */}
      <section className="card">
        <p className="eyebrow">Hear it as one chord</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {stack.notes.map((n, i) => (
            <div key={i} className="well min-w-[52px] rounded-lg px-3 py-2 text-center">
              <span className="block font-mono text-xl text-cream">{notePretty(n)}</span>
              {stack.degrees[i] && (
                <span className="block font-mono text-[13px] text-muted">{stack.degrees[i]}</span>
              )}
            </div>
          ))}
        </div>
        <p className={`mt-3 ${PROSE}`}>{stackLine(stack, notes, scale.removed)}</p>
        <button className="btn btn-primary mt-4"
                onClick={() => sound("the whole scale, stacked in thirds", stack.notes.map(midi), 0.09)}>
          ▶ Hear it as one chord
        </button>
      </section>
    </div>
  );
}

const NONE: Note[] = [];

/** A small piano inside a card: the chord's notes marked, gold while it sounds. */
function MiniKeys({ scale, removed, voicing, lit, small = false }: {
  scale: Note[]; removed: Note | null; voicing: number[]; lit: number[] | null; small?: boolean;
}) {
  const sounding = !!lit && lit.length === voicing.length && lit.every((m, i) => ((m - voicing[i]) % 12 + 12) % 12 === 0);
  const start = Math.floor(Math.min(...voicing) / 12) * 12;
  const span = Math.max(...voicing) - start;
  return (
    <div className="pointer-events-none">
      <Keyboard scale={NONE} removed={null} markMidi={voicing}
                activeMidi={sounding ? voicing : null} startMidi={start} octaves={span >= 12 ? 2 : 1}
                height={small ? 48 : 60} keyWidth={small ? 14 : 20} />
    </div>
  );
}

function Head({ title, n, line }: { title: string; n: number; line: string }) {
  return (
    <>
      <h2 className="flex items-baseline gap-3">
        <span className="display text-[28px]">{title}</span>
        <span className="num text-[20px] text-muted">{n}</span>
      </h2>
      <p className={`mt-2 ${PROSE}`}>{line}</p>
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[13px] text-muted">
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />sounding now</span>
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#8E7A2E] align-middle" />the chord you picked</span>
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-cream align-middle" />in the scale</span>
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-red align-middle" />the missing note</span>
    </div>
  );
}

/* ── a suspended chord, drawn as its stack ───────────────────────────── */

function SusCard({ chord, sound, scale, removed, lit }: {
  chord: ChordSet; sound: (label: string, m: number[], s?: number) => void;
  scale: Note[]; removed: Note | null; lit: number[] | null;
}) {
  const [i, setI] = useState(0);
  const n = chord.names[i % chord.names.length];
  const ms = n.voicing.map(midi);
  const gaps = ms.slice(1).map((m, k) => INTERVAL[(m - ms[k]) % 12] ?? "");
  return (
    <div className="well">
      <div className="flex flex-wrap items-baseline gap-x-2">
        {chord.names.map((x, j) => (
          <button key={x.symbol} onClick={() => setI(j)}
                  className={`text-[18px] font-bold transition-colors ${j === i % chord.names.length ? "text-cream" : "text-muted hover:text-cream/80"}`}>
            {j > 0 && <span className="mr-2 font-normal text-muted">=</span>}{chordName(x.symbol)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col items-start">
        {n.notes.map((_, j) => {
          const k = n.notes.length - 1 - j; // draw from the top note down
          return (
            <div key={k} className="flex flex-col items-start">
              <span className={`grid h-9 w-12 place-items-center rounded-lg border font-mono text-[15px] ${
                k === 0 ? "border-cream/70 text-cream" : "border-line text-cream/85"}`}>{pn(n.notes[k])}</span>
              {k > 0 && (
                <span className="flex h-6 items-center gap-2 pl-6">
                  <i className="h-full w-px bg-line" />
                  <span className="font-mono text-[12px] text-muted">{gaps[k - 1]}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3"><MiniKeys scale={scale} removed={removed} voicing={ms} lit={lit} /></div>
      <button className="btn btn-ghost mt-3 !px-3.5 !py-2 text-[14px]" onClick={() => sound(chordName(n.symbol), ms)}>
        ▶ Hear {chordName(n.symbol)}
      </button>
    </div>
  );
}

/* ── chord trees: the melody note in the middle, its chords on the branches ─ */

type Under = ReturnType<typeof chordsUnderEachNote>[number];

const ROLE_WORD: Record<string, string> = { root: "root", "3rd": "3rd", "5th": "5th", "6th": "6th", "7th": "7th" };

function ChordTrees({ under, sound, scale, removed, lit }: {
  under: Under[]; sound: (label: string, m: number[], s?: number) => void;
  scale: Note[]; removed: Note | null; lit: number[] | null;
}) {
  const [sel, setSel] = useState(0);
  const [size, setSize] = useState<"3" | "all">("all");
  const [branchLit, setBranchLit] = useState<string | null>(null);
  useEffect(() => { setSel(0); setBranchLit(null); }, [under]);
  const d = under[Math.min(sel, under.length - 1)];
  if (!d) return null;
  const branches = d.under.filter((u) => size === "all" || u.voicing.length === 3);
  const melody = notePretty(d.note);

  return (
    <section className="card">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Chord trees</p>
          <h2 className="display mt-1 text-[28px]">What fits under each note</h2>
          <p className={`mt-2 ${PROSE}`}>
            Pick a melody note. It sits in the middle; every chord of this scale that contains it
            grows out as a branch, voiced with your note on top. The small word says what job your
            note does in that chord. This is the idea behind our Chord Trees app, kept to this scale&rsquo;s own notes.
          </p>
        </div>
        <div className="seg" role="group" aria-label="Chord size">
          <button type="button" data-on={size === "3"} onClick={() => setSize("3")}>Triads</button>
          <button type="button" data-on={size === "all"} onClick={() => setSize("all")}>+ Sevenths</button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Melody note">
        {under.map((u, i) => (
          <button key={pc(u.note)} role="radio" aria-checked={i === sel}
                  onClick={() => { setSel(i); setBranchLit(null); void previewAudio([midi(u.note)]); }}
                  className={`min-w-[52px] rounded-xl border px-3 py-2 font-mono text-[18px] transition-colors ${
                    i === sel ? "border-cream bg-cream text-bg" : "border-line bg-surface2 text-cream hover:border-[#3A3331]"}`}>
            {notePretty(u.note)}
          </button>
        ))}
      </div>

      <div className="mt-5 grid items-center gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-[440px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {branches.map((u, i) => {
              const a = angle(i, branches.length);
              return (
                <line key={u.symbol} x1="50" y1="50" x2={50 + 36 * Math.cos(a)} y2={50 + 36 * Math.sin(a)}
                      stroke={branchLit === u.symbol ? "#C9A227" : "#3A3331"} strokeWidth={branchLit === u.symbol ? 0.9 : 0.5} />
              );
            })}
          </svg>
          <div className="absolute left-1/2 top-1/2 grid h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-cream bg-surface2">
            <span className="text-center">
              <span className="block text-[30px] font-black leading-none text-cream">{melody}</span>
              <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">melody</span>
            </span>
          </div>
          {branches.map((u, i) => {
            const a = angle(i, branches.length);
            const on = branchLit === u.symbol;
            const first = chordName(u.symbol.split(" = ")[0]);
            return (
              <button key={u.symbol}
                      onClick={() => { setBranchLit(u.symbol); sound(`${first} under ${melody}`, u.voicing); }}
                      style={{ left: `${50 + 38 * Math.cos(a)}%`, top: `${50 + 38 * Math.sin(a)}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-2.5 py-1.5 text-center transition-colors ${
                        on ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface text-cream hover:border-cream/50"}`}>
                <span className="block whitespace-nowrap text-[15px] font-bold leading-tight">{first}</span>
                <span className={`block whitespace-nowrap font-mono text-[11px] ${on ? "text-[#2A2208]" : "text-muted"}`}>
                  {melody} = {ROLE_WORD[u.role] ?? u.role}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {(() => {
            const b = branches.find((u) => u.symbol === branchLit);
            return b ? <MiniKeys scale={scale} removed={removed} voicing={b.voicing} lit={lit} /> : (
              <p className="font-mono text-[13px] text-muted">Tap a branch to see it on the piano, with {melody} on top.</p>
            );
          })()}
          {branches.length === 0 && (
            <p className="text-[15px] text-cream/80">No chord of this scale contains {melody}. It works as a passing note.</p>
          )}
          {branches.map((u) => (
            <button key={u.symbol} onClick={() => { setBranchLit(u.symbol); sound(`${chordName(u.symbol.split(" = ")[0])} under ${melody}`, u.voicing); }}
                    className={`flex w-full items-baseline justify-between gap-4 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                      branchLit === u.symbol ? "border-gold/70 bg-gold/[0.08]" : "border-line bg-surface2 hover:border-[#3A3331]"}`}>
              <span className="text-[16px] font-semibold text-cream">
                {u.symbol.split(" = ").map(chordName).join(" = ")}
              </span>
              <span className="text-[14px] text-cream/75">
                {melody} is the <span className="font-semibold text-cream">{ROLE_WORD[u.role] ?? u.role}</span>
              </span>
            </button>
          ))}
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

const ORD: Record<string, string> = { "3": "3rd", "5": "5th", "7": "7th", "9": "9th", "11": "11th", "13": "13th" };

/** One computed sentence about the stack. */
function stackLine(stack: ThirdsStack, notes: Note[], removed: Note | null): string {
  const from = notePretty(notes[0]);
  if (!stack.degrees.length)
    return `This scale uses one letter twice, so it cannot stack purely in thirds. Stacked as close as it goes from ${from}: ${
      count(stack.thirds)} of the ${count(stack.gaps.length)} gaps are thirds.`;
  const chain = `Stacked in thirds from ${from}: ${stack.degrees.join(" ")}.`;
  if (!stack.missing.length) return `${chain} Every note is a chord tone of one chord.`;
  const gone = list(stack.missing.map((m) => `no ${ORD[m] ?? m}`));
  const why = removed && stack.missing.length === 1 ? `: that is ${notePretty(removed)}, the note this scale leaves out` : "";
  return `${chain} ${cap(gone)}${why}. Every note is still a chord tone of that one chord.`;
}

/** "F#" → a Note, only so notePretty can print ♯ and ♭. */
function noteOf(name: string): Note {
  const alt = ({ "": 0, "#": 1, "##": 2, b: -1, bb: -2 } as Record<string, number>)[name.slice(1)] ?? 0;
  return note(name[0] as Note["letter"], alt as Note["alt"], 4);
}
