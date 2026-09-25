"use client";

/**
 * The Workout. Every road to six notes on one page, and what each hexatonic is
 * related to: knock one note out of four parents, the named families, the
 * same-notes-other-names list, the one-note neighbours, the harmony inside it,
 * and the Barry Harris lens — then a dice roll for creativity and a timed
 * practice plan.
 *
 * Everything shown is computed by src/lib/theory/workout.ts and locked by
 * tests/workout.test.ts. Nothing on this page is typed in by hand.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KEYS, buildScale, familyById } from "@/lib/theory/scales";
import { Note, midi, notePretty, pc } from "@/lib/theory/note";
import { decodeState } from "@/lib/useDrill";
import { decodeCustom } from "@/lib/theory/custom";
import {
  PARENTS, knockOut, identify, neighbours, harmonizeDegrees, barryLens, maskOf, pcsOf,
  practiceQuery, commonTones,
} from "@/lib/theory/workout";
import { previewAudio, previewChords } from "@/lib/audio/engine";
import { Seg } from "@/components/Panels";
import Keyboard from "@/components/Keyboard";

const PRETTY = (s: string) => s.replace(/#/g, "♯").replace(/b/g, "♭");
const PC_NAME = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

/** The named families, in teaching order. */
const PICKS: { label: string; sub: string; fam: string; mode: number }[] = [
  { label: "Minor hexatonic", sub: "1 2 ♭3 4 5 ♭7 · Pushpalathika", fam: "diatonic", mode: 4 },
  { label: "Major, no 4", sub: "1 2 3 5 6 7 · Ionian/Lydian", fam: "diatonic", mode: 0 },
  { label: "Sunday Scale", sub: "1 2 3 4 5 6 · major, no 7", fam: "diatonic", mode: 3 },
  { label: "Sus hexatonic", sub: "1 2 4 5 6 ♭7 · no 3rd", fam: "diatonic", mode: 1 },
  { label: "Blues", sub: "1 ♭3 4 ♭5 5 ♭7", fam: "blues", mode: 0 },
  { label: "Gospel / major blues", sub: "1 2 ♭3 3 5 6", fam: "blues-major", mode: 0 },
  { label: "Mixolydian hexatonic", sub: "1 2 3 5 6 ♭7 · dominant", fam: "mixo", mode: 0 },
  { label: "Whole tone", sub: "1 2 3 ♯4 ♯5 ♭7", fam: "whole", mode: 0 },
  { label: "Augmented", sub: "1 ♭3 3 5 ♯5 7", fam: "aug", mode: 0 },
  { label: "Prometheus", sub: "1 2 3 ♯4 6 ♭7", fam: "prometheus", mode: 0 },
  { label: "Petrushka", sub: "1 ♭2 3 ♯4 5 ♭7", fam: "petrushka", mode: 0 },
  { label: "Messiaen 5", sub: "1 ♭2 4 ♭5 5 7", fam: "messiaen5", mode: 0 },
];

type Source =
  | { kind: "knock"; parent: string; idx: number }
  | { kind: "family"; fam: string; mode: number }
  | { kind: "query"; q: string };

interface Current {
  notes: Note[];
  removed: Note | null;
  title: string;
  practice: string;
}

function resolve(key: string, src: Source): Current {
  if (src.kind === "knock") {
    const row = knockOut(key, src.parent)[src.idx];
    /* Drill it as the NAMED scale when the app has one on this tonic — Practice
       then shows its teaching text — and as a custom set otherwise. */
    const named = row && identify(row.mask).find((e) => e.rank < 1000 && e.tonic === key);
    if (row) return {
      notes: row.notes, removed: row.removedNote,
      title: `${PRETTY(key)} ${row.parent.name.toLowerCase()} without ${PRETTY(row.removedDegree)}`,
      practice: named ? named.practice : practiceQuery(key, row.semis),
    };
  }
  if (src.kind === "family") {
    const s = buildScale(key, src.fam, src.mode);
    const q = new URLSearchParams({ k: key, f: src.fam });
    if (familyById(src.fam).kind === "rotation") q.set("m", String(src.mode));
    return {
      notes: s.notes, removed: s.removed,
      title: `${PRETTY(key)} ${familyById(src.fam).kind === "rotation" ? s.label : familyById(src.fam).short}`,
      practice: q.toString(),
    };
  }
  const q = src.kind === "query" ? src.q : "";
  const st = decodeState(q);
  const s = st.family === "custom"
    ? buildScale(st.key, "custom", 0, decodeCustom(st.custom))
    : buildScale(st.key, st.family, st.mode);
  const names = identify(maskOf(s.pcs));
  return { notes: s.notes, removed: null, title: names[0]?.name ?? s.label, practice: q };
}

/* ── creativity dice ─────────────────────────────────────────────────────── */

const DRILLS: { label: string; q: Record<string, string> }[] = [
  { label: "in fourths — every one perfect in the diatonic hexachord", q: { p: "fourths" } },
  { label: "in thirds — listen for where the fourths appear", q: { p: "thirds" } },
  { label: "groups of 3 in triplets (tisra)", q: { p: "aroha", s: "3", g: "3" } },
  { label: "groups of 5 in triplets (khanda) — 5 bars to land", q: { p: "aroha", s: "3", g: "5" } },
  { label: "cells of 4, running up", q: { p: "cells", c: "4" } },
  { label: "janta — every note doubled", q: { p: "janta" } },
  { label: "the arpeggio ladder — every triad inside", q: { p: "chordLadder" } },
  { label: "two octaves, up and down", q: { p: "both", o: "2" } },
];

const PROMPTS = [
  "Sing each note before you play it. Ear first, fingers second.",
  "Improvise 8 bars over a drone. Land on a chord tone of the tonic triad on every beat 1.",
  "Play the scale, then one of its one-note neighbours below. Sing only the note that changed.",
  "Harmonise the scale top-down using only chords from the Harmonise table on this page.",
  "Barry Harris lens: melody on top, the 6th chord under chord tones and the dim7 under the rest.",
  "Left hand holds 1 and 5. Right hand plays two-bar call and response with yourself.",
  "Compose a four-bar melody that climaxes on the note the parent scale lost.",
  "Hands in contrary motion from the tonic — right hand up, left hand down.",
  "Play it with your eyes closed. Then in the key a semitone up, eyes still closed.",
  "Pick one triad from the scale. Improvise using only its three notes for 30 seconds, then open up to all six.",
];

interface Roll { key: string; pick: (typeof PICKS)[number]; drill: (typeof DRILLS)[number]; prompt: string }

/* ── the 4½-hour workout ─────────────────────────────────────────────────── */

const STATIONS: { min: number; title: string; what: string; href: string }[] = [
  { min: 15, title: "Warm-up", what: "Minor hexatonic, aroha–avaroha, hands separately then together. Three keys round the circle: C, G, D. 84 bpm.", href: "/practice" },
  { min: 30, title: "Knock one out", what: "On this page: play all seven rows of Major and Natural minor. Before each, sing the note that is about to vanish. Which rows keep the tritone?", href: "/workout" },
  { min: 30, title: "Blues & gospel", what: "Blues, then gospel (major blues) — the same six notes a minor third apart. Twelve-bar lane, both hands.", href: "/improvise?lane=blues" },
  { min: 20, title: "Symmetry: whole tone & augmented", what: "Only 2 whole-tone scales and 4 augmented scales exist. Play every one of them. Feel the lack of a fifth.", href: "/scales" },
  { min: 10, title: "Break", what: "Stand up. Water. No instrument.", href: "" },
  { min: 25, title: "The fourths cycle", what: "In fourths, all twelve keys, round the circle. Every interval perfect — say out loud when one is not.", href: "/practice?p=fourths" },
  { min: 30, title: "Rhythm: 3s, 4s, 5s, 7s", what: "Same scale, four groupings in triplets. Count konnakol out loud: ta-ki-ta, ta-ka-di-mi, ta-di-gi-na-thom.", href: "/live" },
  { min: 30, title: "Harmonisation", what: "Harmonise each note from the table on this page. Then the Pair atlas: two triads, six notes.", href: "/harmony?tab=triads" },
  { min: 10, title: "Break", what: "Walk. Hum the minor hexatonic away from the piano.", href: "" },
  { min: 30, title: "Barry Harris", what: "The 6th-diminished movement in C, then the lens on this page: which notes of your hexatonic are chord tones and which are diminished.", href: "/harmony?tab=barry" },
  { min: 20, title: "Ear training", what: "Which note is missing? Twenty rounds. Keep a score and try to beat it.", href: "/ear" },
  { min: 20, title: "Creativity", what: "Roll the dice below five times. Record yourself on the last one.", href: "/improvise" },
];

export default function WorkoutClient() {
  const [key, setKey] = useState("C");
  const [parent, setParent] = useState("major");
  const [src, setSrc] = useState<Source>({ kind: "knock", parent: "major", idx: 3 });
  const [roll, setRoll] = useState<Roll | null>(null);
  const [done, setDone] = useState<boolean[]>(() => STATIONS.map(() => false));

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hexatonic-workout-done");
      const saved = raw ? JSON.parse(raw) : null;
      if (Array.isArray(saved) && saved.length === STATIONS.length) setDone(saved.map(Boolean));
    } catch { /* private mode: ticks simply do not persist */ }
  }, []);
  const tick = (i: number) => setDone((d) => {
    const next = d.map((v, j) => (j === i ? !v : v));
    try { localStorage.setItem("hexatonic-workout-done", JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const rows = useMemo(() => knockOut(key, parent), [key, parent]);
  const cur = useMemo(() => resolve(key, src), [key, src]);
  const mask = useMemo(() => maskOf(cur.notes.map(pc)), [cur]);
  const aka = useMemo(() => identify(mask), [mask]);
  const near = useMemo(() => neighbours(mask), [mask]);
  const harmony = useMemo(() => harmonizeDegrees(cur.notes), [cur]);
  const lens = useMemo(() => barryLens(cur.notes), [cur]);
  const orphans = harmony.filter((d) => d.rooted.length === 0).map((d) => pc(d.note));

  const up = cur.notes.map((n) => midi(n));
  const upDown = [...up, up[0] + 12, ...[...up].reverse()];
  const totalMin = STATIONS.reduce((a, s) => a + s.min, 0);
  const doneMin = STATIONS.reduce((a, s, i) => a + (done[i] ? s.min : 0), 0);

  const rollDice = () => {
    const r = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    setRoll({ key: r(KEYS), pick: r(PICKS), drill: r(DRILLS), prompt: r(PROMPTS) });
  };
  const rollHref = (x: Roll) => {
    const q = new URLSearchParams({ k: x.key, f: x.pick.fam, ...x.drill.q });
    if (x.pick.fam === "diatonic") q.set("m", String(x.pick.mode));
    return `/practice?${q}`;
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-3xl pt-2">
        <p className="eyebrow">The Workout</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">Every road to six notes.</h1>
        <p className="lede mt-4">
          Knock one note out of a seven-note scale and see what survives. Meet the
          named hexatonics — blues, gospel, whole tone, augmented. Then ask of any of
          them: what else is it called, what is one note away, what harmony lives
          inside it, and what would Barry Harris put under each note?
        </p>
      </header>

      {/* ── 1. pick a scale ─────────────────────────────────────────────── */}
      <section className="card space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="wk">Key</label>
            <select id="wk" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((k) => <option key={k} value={k}>{PRETTY(k)}</option>)}
            </select>
          </div>
          <p className="max-w-xl text-sm text-muted">
            Tap any row or family to load it below. The key applies to everything on
            the page.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            The named hexatonics
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {PICKS.map((p) => {
              const on = src.kind === "family" && src.fam === p.fam && src.mode === p.mode;
              return (
                <button key={p.label} aria-pressed={on}
                        onClick={() => setSrc({ kind: "family", fam: p.fam, mode: p.mode })}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          on ? "border-gold bg-surface2" : "border-line hover:border-gold"}`}>
                  <span className="block text-sm font-semibold">{p.label}</span>
                  <span className="block font-mono text-[10px] text-muted">{p.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Permutations</p>
            <h2 className="mt-1 text-2xl font-extrabold">Knock one out</h2>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Seg value={parent} ariaLabel="Parent scale"
                 options={PARENTS.map((p) => ({ label: p.name, value: p.id }))}
                 onChange={(v) => setParent(v)} />
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted">{PARENTS.find((p) => p.id === parent)!.note}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="py-2 pr-3">Remove</th>
                <th className="py-2 pr-3">Six notes left</th>
                <th className="py-2 pr-3">Tritones</th>
                <th className="py-2 pr-3">Triads (M · m · ° · +)</th>
                <th className="py-2 pr-3">Also known as</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const on = src.kind === "knock" && src.parent === parent && src.idx === r.removedIndex;
                const own = `${PRETTY(key)} ${r.parent.name.toLowerCase()} without ${PRETTY(r.removedDegree)}`;
                const others = r.names.filter((n) => n !== own).slice(0, 2);
                return (
                  <tr key={r.removedIndex}
                      className={`border-t border-line ${on ? "bg-surface2" : ""}`}>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-red">−{PRETTY(r.removedDegree)}</span>
                      <span className="ml-2 text-muted">({notePretty(r.removedNote)})</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-gold">{r.notes.map(notePretty).join(" ")}</td>
                    <td className={`py-2 pr-3 font-mono ${r.tritones === 0 ? "font-bold text-gold" : "text-muted"}`}>
                      {r.tritones === 0 ? "0 ✓" : r.tritones}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted">
                      {r.triads.major} · {r.triads.minor} · {r.triads.dim} · {r.triads.aug}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted">{others.join(" · ") || "—"}</td>
                    <td className="whitespace-nowrap py-2 text-right">
                      <button className="btn btn-ghost px-3 py-1 text-xs" aria-label={`Hear ${own}`}
                              onClick={() => { void previewAudio(r.notes.map((n) => midi(n)), 0.2); }}>▶</button>
                      <button className="btn btn-ghost ml-1 px-3 py-1 text-xs" data-on={on}
                              onClick={() => setSrc({ kind: "knock", parent, idx: r.removedIndex })}>
                        Study
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 2. the selected scale ───────────────────────────────────────── */}
      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Now studying</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-2xl font-extrabold">{cur.title}</h2>
          <span className="font-mono text-2xl text-gold">{cur.notes.map(notePretty).join("  ")}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => { void previewAudio(up, 0.22); }}>▶ Up</button>
          <button className="btn btn-ghost" onClick={() => { void previewAudio(upDown, 0.2); }}>▶ Up &amp; down</button>
          <Link className="btn btn-ghost" href={`/practice?${cur.practice}`}>Drill it in Practice →</Link>
        </div>
        <div className="mt-5">
          <Keyboard scale={cur.notes} removed={cur.removed}
                    onNote={(m) => { void previewAudio([m]); }} />
        </div>
        {aka.length > 0 && (
          <div className="mt-5">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Same six notes, other names — {aka.length}
            </h3>
            <p className="mt-2 text-sm">{aka.map((e) => e.name).join(" · ")}</p>
          </div>
        )}
      </section>

      {/* ── 3. harmonisation ────────────────────────────────────────────── */}
      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Harmonisation</p>
        <h2 className="mt-1 text-2xl font-extrabold">What can go under each note</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Only chords built entirely from the scale&rsquo;s own notes, found by real
          interval. Tap a chip to hear it voiced with that note on top — the way you
          would harmonise a melody.
          {orphans.length > 0 && (
            <> Notes with no triad of their own:{" "}
              <span className="text-cream">{orphans.map((p) => PC_NAME[p]).join(", ")}</span> —
              those are the ones that need a borrowed or passing chord.</>
          )}
        </p>
        <div className="mt-4 space-y-3">
          {harmony.map((d) => (
            <div key={pc(d.note)} className="flex flex-wrap items-baseline gap-3 border-t border-line pt-3">
              <span className="w-10 shrink-0 font-mono text-lg text-gold">{notePretty(d.note)}</span>
              <span className="w-40 shrink-0 font-mono text-[11px] text-muted">
                rooted: {d.rooted.length ? d.rooted.join(", ") : "none"}
              </span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {d.under.length === 0 && <span className="text-sm text-muted">no tertian chord contains it</span>}
                {d.under.map((u) => (
                  <button key={u.symbol} className="chip px-2.5 py-1 text-xs hover:border-gold"
                          onClick={() => { void previewAudio(u.voicing, 0.03); }}>
                    <span className="font-semibold">{u.symbol}</span>
                    <span className="ml-1 font-mono text-[10px] text-muted">as {u.role}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Barry Harris ─────────────────────────────────────────────── */}
      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">The Barry Harris lens</p>
        <h2 className="mt-1 text-2xl font-extrabold">Sixth chord, or diminished?</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Barry&rsquo;s eight-note scales alternate a 6th chord with a diminished 7th.
          His system has no six-note scale — this is a relation between two systems, not
          something he taught. But when your hexatonic fits inside one of his scales,
          every note becomes either a chord tone or a diminished tone, and you can
          harmonise any melody in it his way.
        </p>
        {lens.length === 0 ? (
          <p className="mt-4 text-amber">
            This scale does not fit inside any sixth-diminished scale — it has notes that
            belong to neither the chord nor its diminished.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {lens.map((b) => {
              const match = orphans.length > 0 &&
                [...orphans].sort((x, y) => x - y).join() === b.dimPcs.join();
              return (
                <div key={`${b.root}-${b.family}`} className="rounded-xl border border-line bg-surface2 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-extrabold">{PRETTY(b.chordSymbol)} <span className="text-sm font-normal text-muted">· {b.familyName}</span></h3>
                    <button className="btn btn-ghost px-3 py-1 text-xs"
                            onClick={() => { void previewChords(b.melody.map((m) => m.voicing), 0.85); }}>
                      ▶ Harmonise the scale
                    </button>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-muted">chord tones </span>
                    <span className="font-mono text-gold">{b.chordTones.map(PRETTY).join(" ")}</span>
                    <span className="ml-3 text-muted">diminished </span>
                    <span className="font-mono text-red">{b.dimTones.map(PRETTY).join(" ") || "—"}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Barry&rsquo;s scale adds {b.missing.map(PRETTY).join(" and ")} — the
                    notes your hexatonic leaves out.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.melody.map((m) => (
                      <button key={m.note}
                              className={`chip px-2.5 py-1 text-xs ${m.isDiminished ? "border-red/60" : "hover:border-gold"}`}
                              onClick={() => { void previewAudio(m.voicing, 0.03); }}>
                        <span className="font-mono text-gold">{PRETTY(m.note)}</span>
                        <span className="ml-1 font-semibold">{PRETTY(m.label)}</span>
                      </button>
                    ))}
                  </div>
                  {match && (
                    <p className="mt-3 text-xs text-cream">
                      The notes with no triad of their own are exactly the diminished tones.
                      That is why they sound like passing notes: they are.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Link href="/harmony?tab=barry" className="mt-4 inline-block text-sm text-gold hover:underline">
          The full Barry Harris movement →
        </Link>
      </section>

      {/* ── 5. neighbours ───────────────────────────────────────────────── */}
      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Similarities</p>
        <h2 className="mt-1 text-2xl font-extrabold">One note away — {near.length}</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Every named hexatonic that shares five of these six notes. Five fingers stay,
          one moves. Smallest moves first — a semitone nudge is the smoothest
          modulation there is. ▶ plays yours, then the neighbour.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {near.map((n) => {
            const theirs = pcsOf(n.mask);
            const common = commonTones(mask, n.mask);
            const nbNotes = n.names[0];
            return (
              <div key={n.mask} className="flex min-w-0 items-center gap-3 rounded-lg border border-line px-3 py-2">
                <span className="w-24 shrink-0 font-mono text-sm">
                  <span className="text-red">{PC_NAME[n.drop]}</span>
                  <span className="text-muted"> → </span>
                  <span className="text-gold">{PC_NAME[n.add]}</span>
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  {n.names[0].name}
                  {n.names.length > 1 && <span className="block truncate text-xs text-muted">= {n.names.slice(1, 3).map((x) => x.name).join(" = ")}</span>}
                </span>
                <button className="btn btn-ghost px-3 py-1 text-xs" aria-label={`Compare with ${nbNotes.name}`}
                        onClick={() => {
                          const base = pc(cur.notes[0]);
                          const lift = (p: number) => midi(cur.notes[0]) + ((((p - base) % 12) + 12) % 12);
                          const theirsUp = [...theirs].map(lift).sort((a, b) => a - b);
                          void previewAudio([...up, ...theirsUp], 0.18);
                        }}>▶</button>
                <button className="btn btn-ghost px-3 py-1 text-xs"
                        title={`${common.length} common tones`}
                        onClick={() => setSrc({ kind: "query", q: n.names[0].practice })}>Go</button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. creativity ───────────────────────────────────────────────── */}
      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Creativity</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">Roll a challenge</h2>
          <button className="btn btn-primary" onClick={rollDice}>🎲 Roll</button>
        </div>
        {roll ? (
          <div className="mt-4 rounded-xl border border-gold/50 bg-surface2 p-5">
            <p className="display text-3xl">
              {PRETTY(roll.key)} {roll.pick.label}
            </p>
            <p className="mt-1 font-mono text-sm text-muted">{roll.pick.sub}</p>
            <p className="mt-3">Drill it <span className="text-gold">{roll.drill.label}</span>.</p>
            <p className="mt-2 text-cream">Then: {roll.prompt}</p>
            <Link href={rollHref(roll)} className="btn btn-ghost mt-4 inline-block">Open this drill →</Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            A random key, a random hexatonic, a random drill and one creative constraint.
            Great for the end of a practice session — or for pairs in class.
          </p>
        )}
      </section>

      {/* ── 7. the plan ─────────────────────────────────────────────────── */}
      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Today&rsquo;s workout</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-extrabold">4½ hours, twelve stations</h2>
          <span className="font-mono text-sm text-muted">{doneMin} / {totalMin} min</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div className="h-full bg-gold transition-all" style={{ width: `${(doneMin / totalMin) * 100}%` }} />
        </div>
        <ol className="mt-4 space-y-2">
          {STATIONS.map((s, i) => (
            <li key={i} className={`flex gap-3 rounded-lg border px-3 py-2.5 ${done[i] ? "border-gold/40 opacity-60" : "border-line"}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#C9A227]" checked={done[i]}
                     onChange={() => tick(i)} aria-label={`Done: ${s.title}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">{s.title}</span>
                  <span className="font-mono text-[11px] text-muted">{s.min} min</span>
                  {s.href && <Link href={s.href} className="ml-auto text-sm text-gold hover:underline">Open →</Link>}
                </div>
                <p className="mt-0.5 text-sm text-muted">{s.what}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Teaching a class with this? The 90-minute run-sheet is on{" "}
          <Link href="/class" className="text-gold hover:underline">/class</Link>.
        </p>
      </section>
    </div>
  );
}
