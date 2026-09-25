"use client";

/**
 * Why six notes: five things you can hear, then the rhythm.
 *
 * Each idea is one headline, two or three sentences, one button that proves it
 * by ear, one small picture and one link to practise it. Every note, chord and
 * count in the copy is read from src/lib/theory/learn.ts (locked by
 * tests/learn.test.ts). Examples are in G, the app's home key.
 *
 * Sound goes through useLiveDrill, so each proof stops whatever else is playing,
 * stops when you leave the page, and lights exactly the note you are hearing.
 */

import Link from "next/link";
import { useMemo } from "react";
import {
  tritoneFact, sameSixFact, chordStackFact, smallHarmonyFact, fourthsFact,
  pretty, chordLabel, chordWords, listWords,
} from "@/lib/theory/learn";
import { sixVsSeven, solveResolution, GATIS } from "@/lib/theory/resolution";
import { midi, note, Note, notePretty, pc } from "@/lib/theory/note";
import { DrillPlan } from "@/lib/audio/engine";
import { useLiveDrill, LiveDrill } from "@/lib/audio/useLive";
import Keyboard from "@/components/Keyboard";
import ScaleRing from "@/components/ScaleRing";
import BeatCounter from "@/components/BeatCounter";

/* ── the facts, computed once ─────────────────────────────────────────── */

const T = tritoneFact();
const S = sameSixFact();
const C = chordStackFact();
const H = smallHarmonyFact();
const F = fourthsFact();
const R = sixVsSeven();

const KEY = notePretty(S.major.notes[0]);          // "G"
const GONE = notePretty(S.removed);                  // "C"
const up = (n: Note) => note(n.letter, n.alt, n.octave + 1);
const names = (ns: Note[]) => ns.map(notePretty).join(" ");

/* A step is what sounds at once: one note, or a chord. `null` is a beat of
   silence, so the last note rings before the proof ends. */
type Step = Note[] | null;

const STEPS = {
  tritone: [[T.tritone[0]], [T.tritone[1]], [T.tritone[0], T.tritone[1]], null, null] as Step[],
  sameSix: [
    ...S.major.notes.map((n) => [n]), [up(S.major.notes[0])], null,
    ...S.minor.notes.map((n) => [n]), [up(S.minor.notes[0])], null, null,
  ] as Step[],
  chord: [...C.voiced.map((n) => [n]), C.voiced, null, null] as Step[],
  triads: [...H.triads.map((c) => c.notes), null] as Step[],
  fourths: [...F.six.pairs.flatMap((p) => [[p.from], [p.to]]), null, null] as Step[],
};

/* ── playback ─────────────────────────────────────────────────────────── */

function useProof(steps: Step[], stepDur: number) {
  const plan = useMemo<DrillPlan>(() => ({
    notes: steps.map((s) => (s ? s[0] : null)),
    chords: steps.map((s) => (s ? s.map(midi) : null)),
    spread: 0.012,
    accents: steps.map(() => false),
    stepDur,
    grouping: steps.length,
    subdivision: 1,
    beatsPerBar: 4,
    loop: false,
    click: false,
  }), [steps, stepDur]);
  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur: stepDur }));
  const index = live.position && live.position.plan.notes === plan.notes ? live.position.index : -1;
  const step = index >= 0 ? steps[index] ?? null : null;
  return { live, index, step };
}

/** What the keyboard lights for a step: one key gold, or a chord's keys. */
const lightFor = (step: Step) => ({
  activeMidi: step && step.length === 1 ? midi(step[0]) : null,
  chordTonePcs: step && step.length > 1 ? step.map(pc) : undefined,
});

function PlayButton({ live, label }: { live: LiveDrill; label: string }) {
  const on = live.playing || live.loading;
  return (
    <button type="button" onClick={live.toggle} aria-pressed={on} data-on={on}
            className="btn btn-ghost min-h-[44px] px-5 text-[15px] text-cream">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {on ? <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor" />
            : <path d="M2.5 1.2v9.6L10.6 6z" fill="currentColor" />}
      </svg>
      {live.loading ? "Loading the piano…" : live.playing ? "Stop" : label}
    </button>
  );
}

function PractiseLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
          className="group inline-flex min-h-[44px] items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/85 transition-colors hover:text-cream">
      <span className="underline decoration-cream/30 underline-offset-4 group-hover:decoration-cream">
        {children}
      </span>
      <span aria-hidden="true" className="transition-transform duration-150 ease-out group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

function Idea({
  n, title, children, play, practise, visual,
}: {
  n: number; title: string; children: React.ReactNode;
  play: React.ReactNode; practise: React.ReactNode; visual: React.ReactNode;
}) {
  return (
    <article className="card grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-12 lg:p-9">
      <div>
        <p className="font-mono text-[13px] tabular-nums text-muted">{String(n).padStart(2, "0")}</p>
        <h3 className="display mt-2 text-[28px] sm:text-[34px]">{title}</h3>
        <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-cream/80">{children}</div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          {play}
          {practise}
        </div>
      </div>
      <div className="well min-w-0 p-4 sm:p-5">{visual}</div>
    </article>
  );
}

/* A note name that lights while it sounds. Gold = sounding now, nothing else. */
function NoteChip({ label, lit, gone }: { label: string; lit?: boolean; gone?: boolean }) {
  if (gone) {
    return (
      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-red/70 px-2 font-mono text-[15px] text-red line-through decoration-2"
            title="the note taken out">
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 font-mono text-[15px] ${
      lit ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2 text-cream"}`}>
      {label}
    </span>
  );
}

/* ── 1 ────────────────────────────────────────────────────────────────── */

function TritoneIdea() {
  const { live, step } = useProof(STEPS.tritone, 0.6);
  const [lo, hi] = T.tritone.map(notePretty);
  return (
    <Idea n={1}
      title={`Only the ${T.clean[0].degree} or the ${T.clean[1].degree} can go.`}
      play={<PlayButton live={live} label={`Hear the tritone ${lo}–${hi}`} />}
      practise={<PractiseLink href="/practice?k=G&f=diatonic&m=0">Practise {KEY} major, no 4th</PractiseLink>}
      visual={
        <div className="space-y-4">
          <Keyboard scale={T.major} removed={null} startMidi={60} octaves={2} height={96}
                    {...lightFor(step)} />
          <table className="w-full font-mono text-[14px]">
            <caption className="sr-only">Each note of {KEY} major removed in turn, and the tritones left</caption>
            <thead>
              <tr className="text-left text-[13px] text-muted">
                <th scope="col" className="pb-2 pr-3 font-normal">take out</th>
                <th scope="col" className="pb-2 pr-3 font-normal">what&rsquo;s left</th>
                <th scope="col" className="pb-2 text-right font-normal">tritone?</th>
              </tr>
            </thead>
            <tbody>
              {T.rows.map((r) => {
                const clean = r.tritones === 0;
                return (
                  <tr key={r.removedDegree} className="border-t border-line/70">
                    <td className={`py-1.5 pr-3 ${clean ? "font-semibold text-cream" : "text-muted"}`}>
                      {pretty(r.removedNote)}
                    </td>
                    <td className={`py-1.5 pr-3 ${clean ? "text-cream" : "text-muted"}`}>
                      {pretty(r.notes.join(" "))}
                    </td>
                    <td className={`py-1.5 text-right ${clean ? "font-semibold text-cream" : "text-muted"}`}>
                      {clean ? "none" : `${r.tritones}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      }>
      <p>
        {KEY} major has exactly one tritone, the tense gap from {lo} up to {hi}.
        Take out {lo} or {hi} and it is gone. Take out any other note and it stays.
      </p>
    </Idea>
  );
}

/* ── 2 ────────────────────────────────────────────────────────────────── */

function SameSixIdea() {
  const { live, index, step } = useProof(STEPS.sameSix, 0.26);
  const minorKey = notePretty(S.minor.notes[0]);
  const majorLen = S.major.notes.length + 2;          // six notes, the top, a rest
  const inMajor = index >= 0 && index < majorLen;
  const inMinor = index >= majorLen;
  const lit = (on: boolean) => (n: Note) =>
    on && !!step && step.length === 1 && pc(step[0]) === pc(n);
  const litMajor = lit(inMajor);
  const litMinor = lit(inMinor);
  return (
    <Idea n={2}
      title="Major and minor share the same six notes."
      play={<PlayButton live={live} label={`Hear ${KEY} major, then ${minorKey} minor`} />}
      practise={<PractiseLink href={`/practice?k=${S.minor.tonic}&f=diatonic&m=4`}>Practise {minorKey} minor, no ♭6</PractiseLink>}
      visual={
        <div className="space-y-4">
          <Keyboard scale={S.major.notes} removed={S.removed} startMidi={60} octaves={2} height={96}
                    {...lightFor(step)} />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 font-mono text-[13px] text-muted">{KEY} major, no 4th</p>
              <div className="flex flex-wrap gap-1.5">
                {S.major.notes.map((n) => <NoteChip key={n.letter} label={notePretty(n)} lit={litMajor(n)} />)}
              </div>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[13px] text-muted">{minorKey} minor, no ♭6</p>
              <div className="flex flex-wrap gap-1.5">
                {S.minor.notes.map((n) => <NoteChip key={n.letter} label={notePretty(n)} lit={litMinor(n)} />)}
              </div>
            </div>
          </div>
        </div>
      }>
      <p>
        {KEY} major without its 4th is {names(S.major.notes)}. Start the same six
        notes on {minorKey} and you have {minorKey} minor without its ♭6.
      </p>
      <p>One set of notes, two homes. The note both leave out is {GONE}.</p>
    </Idea>
  );
}

/* ── 3 ────────────────────────────────────────────────────────────────── */

function ChordIdea() {
  const { live, step } = useProof(STEPS.chord, 0.34);
  const whole = !!step && step.length > 1;
  const activePc = step && step.length === 1 ? pc(step[0]) : null;
  const stackWords = C.voiced.map(notePretty);
  return (
    <Idea n={3}
      title="The scale is one chord."
      play={<PlayButton live={live} label="Hear it stack up" />}
      practise={<PractiseLink href="/practice?k=G&f=diatonic&m=0&p=thirds">Practise it in thirds</PractiseLink>}
      visual={
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
          <ScaleRing notes={S.major.notes} removed={C.removed} activePc={activePc} size={220}
                     className="max-w-full" />
          <div>
            <p className="mb-2 font-mono text-[13px] text-muted">stacked in thirds, low to high</p>
            <div className="flex flex-wrap gap-1.5 sm:flex-col-reverse sm:flex-nowrap">
              {C.stack.map(({ note: n, removed }) => (
                <NoteChip key={n.letter} label={notePretty(n)} gone={removed}
                          lit={!removed && (whole || (activePc !== null && pc(n) === activePc))} />
              ))}
            </div>
          </div>
        </div>
      }>
      <p>
        Stack the six notes in thirds from {KEY}: {listWords(stackWords)}. That
        is {KEY}maj13 without its 11th, and every note of the scale is in it.
      </p>
      <p>The one third the stack skips is {GONE}, the note we took out.</p>
    </Idea>
  );
}

/* ── 4 ────────────────────────────────────────────────────────────────── */

function HarmonyIdea() {
  const { live, index } = useProof(STEPS.triads, 0.9);
  const lost = listWords(H.lost.map((c) => chordWords(c.names[0].symbol)));
  const sounding = index >= 0 && index < H.triads.length ? H.triads[index] : null;
  return (
    <Idea n={4}
      title="Only four chords fit."
      play={<PlayButton live={live} label="Hear the four chords" />}
      practise={<PractiseLink href="/practice?k=G&f=diatonic&m=0&p=chordLadder">Practise the chords</PractiseLink>}
      visual={
        <div className="space-y-4">
          <Keyboard scale={S.major.notes} removed={S.removed} startMidi={60} octaves={2} height={96}
                    chordTonePcs={sounding ? sounding.pcs : undefined} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {H.triads.map((c, i) => {
              const on = i === index;
              return (
                <div key={c.pcs.join(",")}
                     className={`rounded-xl border px-3 py-2.5 text-center ${
                       on ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2"}`}>
                  <p className="text-[18px] font-bold">{chordLabel(c.names[0].symbol)}</p>
                  <p className={`font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-muted"}`}>
                    {pretty(c.noteNames.join(" "))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      }>
      <p>
        The six notes make four triads:{" "}
        {listWords(H.triads.map((c) => chordWords(c.names[0].symbol)))}.
      </p>
      <p>
        Full {KEY} major has three more, {lost}, and all three need the {GONE}.
      </p>
    </Idea>
  );
}

/* ── 5 ────────────────────────────────────────────────────────────────── */

function FourthsIdea() {
  const { live, index, step } = useProof(STEPS.fourths, 0.24);
  const pair = index >= 0 && index < F.six.pairs.length * 2 ? Math.floor(index / 2) : -1;
  const [b] = F.breaks;
  const first = F.six.pairs.slice(0, 2).map((p) => `${notePretty(p.from)} to ${notePretty(p.to)}`);
  const Pair = ({ p, lit, flaw }: { p: (typeof F.six.pairs)[number]; lit?: boolean; flaw?: boolean }) => (
    <span className={`inline-flex items-baseline gap-1 rounded-lg border px-2 py-1 font-mono text-[14px] ${
      lit ? "border-gold bg-gold text-[#17130a]"
          : flaw ? "border-amber/70 text-amber" : "border-line bg-surface2 text-cream"}`}>
      {notePretty(p.from)}–{notePretty(p.to)}
      <span className={`text-[13px] ${lit ? "text-[#2A2208]" : flaw ? "" : "text-muted"}`}>{p.interval}</span>
    </span>
  );
  return (
    <Idea n={5}
      title="Every fourth is perfect."
      play={<PlayButton live={live} label="Hear all six" />}
      practise={<PractiseLink href="/practice?k=G&f=diatonic&m=0&p=fourths">Practise it in fourths</PractiseLink>}
      visual={
        <div className="space-y-4">
          <Keyboard scale={S.major.notes} removed={S.removed} startMidi={60} octaves={2} height={96}
                    {...lightFor(step)} />
          <div>
            <p className="mb-1.5 font-mono text-[13px] text-muted">six notes: all perfect</p>
            <div className="flex flex-wrap gap-1.5">
              {F.six.pairs.map((p, i) => <Pair key={i} p={p} lit={i === pair} />)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[13px] text-muted">
              seven notes: {notePretty(b.from)}–{notePretty(b.to)} breaks the chain
            </p>
            <div className="flex flex-wrap gap-1.5">
              {F.seven.pairs.map((p, i) => <Pair key={i} p={p} flaw={p === b} />)}
            </div>
          </div>
        </div>
      }>
      <p>
        Move three scale steps at a time ({listWords([...first, "so on"])}) and every
        jump is a perfect fourth or fifth: six out of six.
      </p>
      <p>
        In full {KEY} major, {notePretty(b.from)} to {notePretty(b.to)} breaks the
        chain, and {notePretty(b.from)} is the note we took out.
      </p>
    </Idea>
  );
}

/* ── rhythm ───────────────────────────────────────────────────────────── */

const RHYTHM_BPM = 84;
const RHYTHM_G = 4;
/** The audible proof: the six notes straight up, in groups of 4, 16ths in 4/4,
 *  until they land. The solver says how many notes that takes; the last stroke
 *  is the tonic on beat 1. */
const RHYTHM_NOTES: (Note | null)[] = (() => {
  const total = solveResolution(6, 4, 4, RHYTHM_G, "full").totalNotes;
  const run = Array.from({ length: total }, (_, i) => S.major.notes[i % 6]);
  return [...run, S.major.notes[0], null, null, null];
})();

function RhythmSection() {
  const bars = solveResolution(6, 4, 4, RHYTHM_G, "full").bars;
  const plan = useMemo<DrillPlan>(() => ({
    notes: RHYTHM_NOTES,
    stepDur: 60 / RHYTHM_BPM / 4,
    grouping: RHYTHM_G,
    subdivision: 4,
    beatsPerBar: 4,
    loop: false,
    click: true,
  }), []);
  const live = useLiveDrill(plan, () => ({ countInBeats: 4, beatDur: 60 / RHYTHM_BPM }));
  const index = live.position && live.position.plan.notes === plan.notes ? live.position.index : -1;
  const sounding = index >= 0 ? RHYTHM_NOTES[index] : null;
  const shares6 = R.filter((r) => r.sixShares).map((r) => String(r.grouping));
  const shares7 = R.filter((r) => r.sevenShares).map((r) => String(r.grouping));

  return (
    <section aria-labelledby="rhythm" className="card grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-12 lg:p-9">
      <div>
        <p className="eyebrow">And in rhythm</p>
        <h2 id="rhythm" className="display mt-2 text-[28px] sm:text-[34px]">Six lines up. Seven mostly doesn&rsquo;t.</h2>
        <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-cream/80">
          <p>
            Play a scale in accented groups over a 4/4 bar of 16th notes, and count the
            bars until the first note of the scale, the accent and beat 1 meet again.
          </p>
          <p>
            Six splits into 2s and 3s, so it lines up with most groupings (here,
            groups of {listWords(shares6)}). Seven is prime and lines up only with
            groups of {listWords(shares7)}.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <PlayButton live={live} label={`Hear groups of ${RHYTHM_G} land in ${bars} bars`} />
          <PractiseLink href="/resolution">Which bar does it land on?</PractiseLink>
        </div>
      </div>

      <div className="well min-w-0 space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {S.major.notes.map((n) => (
              <NoteChip key={n.letter} label={notePretty(n)}
                        lit={!!sounding && pc(sounding) === pc(n)} />
            ))}
          </div>
          <BeatCounter at={live.position} beats={4} bars={bars + 1} countdown={live.countdown} />
        </div>
        <table className="w-full text-[15px]">
          <caption className="sr-only">Bars to land, six notes against seven, 4/4 in 16ths</caption>
          <thead>
            <tr className="text-left font-mono text-[13px] text-muted">
              <th scope="col" className="pb-2 pr-3 font-normal">accent every</th>
              <th scope="col" className="pb-2 pr-3 text-right font-normal">six notes</th>
              <th scope="col" className="pb-2 text-right font-normal">seven notes</th>
            </tr>
          </thead>
          <tbody>
            {R.map((r) => {
              const sixWins = r.six < r.seven;
              return (
                <tr key={r.grouping} className="border-t border-line/70">
                  <td className="py-2 pr-3">
                    <span className="text-cream">{r.grouping} notes</span>
                    {GATIS[r.grouping]?.name && (
                      <span className="ml-2 font-mono text-[13px] text-muted">
                        {GATIS[r.grouping].name!.toLowerCase()}
                      </span>
                    )}
                  </td>
                  <td className={`py-2 pr-3 text-right tabular-nums ${sixWins ? "font-bold text-cream" : "text-muted"}`}>
                    {r.six} bars
                  </td>
                  <td className={`py-2 text-right tabular-nums ${!sixWins ? "font-bold text-cream" : "text-muted"}`}>
                    {r.seven} bars
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */

export default function LearnClient() {
  return (
    <div className="space-y-6 pb-12">
      <header className="max-w-3xl pb-4 pt-2">
        <p className="eyebrow">Learn</p>
        <h1 className="display mt-3 text-[44px] sm:text-[60px]">Why six notes</h1>
        <p className="pull mt-5 max-w-xl">
          Take one note out of a major scale, and the six that are left start to behave
          differently.
        </p>
        <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-cream/80">
          Every example is in {KEY}. On the keyboards, the note taken out is marked in
          red, and gold lights only what you are hearing.
        </p>
      </header>

      <h2 className="display pt-4 text-[26px] sm:text-[30px]">Five things you can hear</h2>

      <TritoneIdea />
      <SameSixIdea />
      <ChordIdea />
      <HarmonyIdea />
      <FourthsIdea />

      <div className="pt-6"><RhythmSection /></div>
    </div>
  );
}
