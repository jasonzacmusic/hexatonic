"use client";

/**
 * Why six notes: Jason Zac's hexatonic lesson, in his order.
 *
 * Source: his YouTube lesson "Piano Workout: 2 Chords, All Inversions & Modal
 * Hexatonic Scales", his handwritten notes for it, and his Music Gym class on
 * the same material. Seven steps: the Sunday Scale, its two chords, the
 * inversion climb, the minor version, the four modal pairs, accents in 3s, 4s
 * and 5s, and how to practise. Quotes are his words, verbatim from those
 * transcripts. Every note, chord and count is read from
 * src/lib/theory/learn.ts and locked by tests/learn.test.ts. Examples are in G.
 *
 * Sound goes through useLiveDrill: each proof stops whatever else is playing,
 * stops when you leave the page, lights exactly what you are hearing, and a
 * setting changed while it plays (mode, grouping, key pair) lands on the next
 * bar or cycle without stopping the music.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  sweetSpotFact, twoChordsFact, inversionDrillFact, minorFact, modalFact, MODES, ModeId,
  rhythmFact, GROUPINGS, keyPairs, sundayRun, chordLabel, chordWords, listWords, pretty, DrillStep,
} from "@/lib/theory/learn";
import { solveResolution } from "@/lib/theory/resolution";
import { KEYS } from "@/lib/theory/scales";
import { midi, Note, notePretty, pc } from "@/lib/theory/note";
import { DrillPlan } from "@/lib/audio/engine";
import { useLiveDrill, LiveDrill } from "@/lib/audio/useLive";
import Keyboard from "@/components/Keyboard";
import ScaleRing from "@/components/ScaleRing";
import BeatCounter from "@/components/BeatCounter";

/* ── the facts, computed once ─────────────────────────────────────────── */

const S = sweetSpotFact();
const TWO = twoChordsFact();
const INV = inversionDrillFact();
const MIN = minorFact();
const MODAL = Object.fromEntries(MODES.map((m) => [m.id, modalFact(m.id)])) as Record<ModeId, ReturnType<typeof modalFact>>;
const RHY = rhythmFact();
const PAIRS = keyPairs(KEYS);

const KEY = notePretty(S.sunday[0]);                 // "G"
const P = (n: Note) => notePretty(n);
const names = (ns: Note[]) => ns.map(P).join(" ");
const up = (n: Note): Note => ({ ...n, octave: n.octave + 1 });
const VIDEO = "https://www.youtube.com/watch?v=qakASBgKQ9U";
const VIDEO_TITLE = "Piano Workout: 2 Chords, All Inversions & Modal Hexatonic Scales";

/* ── playback ─────────────────────────────────────────────────────────── */

/** What sounds at once: a list of keys. `null` is a beat of silence. */
type Beat = number[] | null;

/** A placeholder spelled note for chord steps; the engine sounds `chords`. */
const HOLD: Note = { letter: "C", alt: 0, octave: 4 };

function planFor(beats: Beat[], stepDur: number, loop: boolean): DrillPlan {
  return {
    notes: beats.map((b) => (b ? HOLD : null)),
    chords: beats,
    spread: 0.012,
    accents: beats.map(() => false),
    stepDur,
    grouping: beats.length,
    subdivision: 1,
    beatsPerBar: 4,
    loop,
    click: false,
  };
}

/** Play `plan`; report the index of the step sounding now (or -1). */
function useProof(plan: DrillPlan, beatDur = plan.stepDur) {
  const live = useLiveDrill(plan, () => ({ countInBeats: 0, beatDur }));
  /* The engine hands back a copy of the first plan, so match by the notes
     array, which every plan owns. */
  const index = live.position && live.position.plan.notes === plan.notes ? live.position.index : -1;
  return { live, index };
}

const notesToBeats = (ns: (Note | null)[]): Beat[] => ns.map((n) => (n ? [midi(n)] : null));
const drillBeats = (steps: DrillStep[]): Beat[] => [...steps.map((s) => s.voicing), null];

/* ── small pieces ─────────────────────────────────────────────────────── */

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

function PractiseLink({ href, children, lead = "Practise" }: { href: string; children: React.ReactNode; lead?: string }) {
  return (
    <Link href={href}
          className="group inline-flex min-h-[44px] items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/85 transition-colors hover:text-cream">
      <span className="text-muted">{lead}</span>
      <span className="underline decoration-cream/30 underline-offset-4 group-hover:decoration-cream">
        {children}
      </span>
      <span aria-hidden="true" className="transition-transform duration-150 ease-out group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

/** Jason's own words, verbatim from the transcripts. */
function Said({ children }: { children: string }) {
  return (
    <figure className="border-l-2 border-line-control pl-4">
      <blockquote className="font-serif text-[21px] italic leading-[1.3] text-cream/90">
        &ldquo;{children}&rdquo;
      </blockquote>
      <figcaption className="mt-1 font-mono text-[13px] text-muted">Jason Zac</figcaption>
    </figure>
  );
}

function Step({
  n, id, title, children, play, practise, visual,
}: {
  n: number; id: string; title: string; children: React.ReactNode;
  play: React.ReactNode; practise: React.ReactNode; visual: React.ReactNode;
}) {
  return (
    <article id={id} aria-labelledby={`${id}-h`}
             className="card grid scroll-mt-24 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-10 lg:p-8">
      <div className="min-w-0">
        <p className="font-mono text-[13px] tabular-nums text-muted">Step {n} of 7</p>
        <h2 id={`${id}-h`} className="display mt-1.5 text-[27px] leading-[1.08] sm:text-[32px]">{title}</h2>
        <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-cream/80">{children}</div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1">
          {play}
          {practise}
        </div>
      </div>
      <div className="well min-w-0 space-y-4 p-3 sm:p-5">{visual}</div>
    </article>
  );
}

/* A note name that lights while it sounds. Gold = sounding now, nothing else;
   red = the note taken out, and only that. */
function NoteChip({ label, lit, gone }: { label: string; lit?: boolean; gone?: boolean }) {
  return (
    <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 font-mono text-[15px] transition-colors duration-100 ${
      lit ? "border-gold bg-gold text-[#17130a]"
          : gone ? "border-red/80 text-red"
          : "border-line bg-surface2 text-cream"}`}
          title={gone ? "the note taken out" : undefined}>
      {label}
    </span>
  );
}

/** A chord in the drill: its name and its inversion, gold while it sounds. */
function ChordChip({ label, sub, lit }: { label: string; sub: string; lit: boolean }) {
  return (
    <div className={`min-w-0 flex-1 rounded-xl border px-1 py-2 text-center transition-colors duration-100 ${
      lit ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2"}`}>
      <p className="whitespace-nowrap text-[16px] font-bold leading-tight">{label}</p>
      <p className={`mt-0.5 font-mono text-[13px] ${lit ? "text-[#2A2208]" : "text-muted"}`}>{sub}</p>
    </div>
  );
}

const SHORT_INV: Record<string, string> = {
  "root position": "root", "first inversion": "1st", "second inversion": "2nd",
};

function DrillChips({ steps, index }: { steps: DrillStep[]; index: number }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[13px] text-muted">root position, 1st and 2nd inversion</p>
      <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-7" aria-label="the chords in order">
        {steps.map((s, i) => (
          <li key={i} className="flex" aria-label={`${s.label}, ${s.inversion}`}>
            <ChordChip label={s.label} sub={SHORT_INV[s.inversion] ?? s.inversion} lit={i === index} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The app's keyboard, sized to its box: as many octaves as the music needs,
 *  and white keys as wide as the space allows. */
function FitKeyboard({
  scale, removed, beat, lo, hi,
}: { scale: Note[]; removed: Note | null; beat: Beat; lo: number; hi: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const start = Math.floor(lo / 12) * 12;
  const octaves = Math.max(1, Math.ceil((hi + 1 - start) / 12));
  const whites = octaves * 7;
  const keyWidth = w ? Math.max(12, Math.min(44, Math.floor(w / whites))) : 24;
  const height = Math.round(Math.max(64, Math.min(104, keyWidth * 3.4)));
  return (
    <div ref={box} className="w-full [&_svg]:mx-auto">
      <Keyboard scale={scale} removed={removed} startMidi={start} octaves={octaves}
                keyWidth={keyWidth} height={height} activeMidi={beat} />
    </div>
  );
}

const span = (beats: Beat[]) => {
  const all = beats.flatMap((b) => b ?? []);
  return { lo: Math.min(...all), hi: Math.max(...all) };
};

/* ── 1. six notes ─────────────────────────────────────────────────────── */

const ROWS = [
  { n: 5, name: "major pentatonic", notes: S.penta, note: `no ${P(S.added)}` },
  { n: 6, name: "Sunday Scale", notes: S.sunday, note: `adds ${P(S.added)}` },
  { n: 7, name: "major scale", notes: S.major, note: `adds ${P(S.dropped)}` },
];
const SWEET_NOTES: (Note | null)[] = ROWS.flatMap((r) => [...r.notes, up(r.notes[0]), null]);
const SWEET_ROW: number[] = ROWS.flatMap((r, i) => Array(r.notes.length + 2).fill(i));
const SWEET_PLAN = planFor(notesToBeats([...SWEET_NOTES, null]), 0.28, false);

function SweetSpotStep() {
  const { live, index } = useProof(SWEET_PLAN);
  const n = index >= 0 ? SWEET_NOTES[index] ?? null : null;
  const row = index >= 0 ? SWEET_ROW[index] : -1;
  const beats = SWEET_PLAN.chords!;
  return (
    <Step n={1} id="six" title="Six notes: the sweet spot."
      play={<PlayButton live={live} label="Hear five, six, then seven" />}
      practise={<PractiseLink href="/sounds?k=G" lead="Hear">more six-note scales</PractiseLink>}
      visual={<>
        <FitKeyboard scale={S.sunday} removed={S.dropped} beat={n ? [midi(n)] : null} {...span(beats)} />
        <div className="space-y-3">
          {ROWS.map((r, i) => (
            <div key={r.n}>
              <p className="mb-1.5 font-mono text-[13px] text-muted">
                <span className={row === i ? "text-cream" : ""}>{r.n} notes · {r.name}</span>
                <span className="ml-2">({r.note})</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {r.notes.map((x) => (
                  <NoteChip key={x.letter} label={P(x)} gone={r.n === 7 && pc(x) === pc(S.dropped) && !(row === i && n && pc(n) === pc(x))}
                            lit={row === i && !!n && pc(n) === pc(x) && n.octave === x.octave} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </>}>
      <p>
        Play {KEY} major but skip the 7th, {P(S.dropped)}: go from {P(S.sunday[5])} straight
        to the octave. The six notes left, {names(S.sunday)}, are what Jason calls
        the <strong className="font-semibold text-cream">Sunday Scale</strong>, used a lot in gospel.
      </p>
      <p>
        It is the pentatonic plus one note ({P(S.added)}), or the major scale minus one. To
        Jason&rsquo;s ear five notes carry less emotion and seven a lot; six sits in the
        middle. Leaving out {P(S.dropped)} also takes out {KEY} major&rsquo;s only
        tritone, {P(S.tritone[0])} to {P(S.tritone[1])}.
      </p>
      <Said>It&rsquo;s a very good sweet spot scale.</Said>
    </Step>
  );
}

/* ── 2. two chords ────────────────────────────────────────────────────── */

const TWO_BEATS: Beat[] = (() => {
  const [a, b] = INV.movement.steps;
  return [a.voicing, b.voicing, a.voicing, b.voicing, null];
})();
const TWO_PLAN = planFor(TWO_BEATS, 0.75, false);

function TwoChordsStep() {
  const { live, index } = useProof(TWO_PLAN);
  const beat = index >= 0 ? TWO_BEATS[index] ?? null : null;
  const pair = beat ? (index % 2) : -1;
  const [c0, c1] = TWO.chords.map(chordWords);
  const strangers = TWO.strangers.map((s) => chordWords(s.symbol));
  return (
    <Step n={2} id="two" title="The scale holds just two chords."
      play={<PlayButton live={live} label={`Hear ${c0}, then ${c1}`} />}
      practise={<PractiseLink href="/practice?k=G&f=diatonic&m=3">the Sunday Scale</PractiseLink>}
      visual={<>
        <FitKeyboard scale={S.sunday} removed={S.dropped} beat={beat} {...span(TWO_BEATS)} />
        <div className="grid grid-cols-2 gap-2">
          {TWO.chordNotes.map((ns, i) => (
            <div key={i} className={`rounded-xl border px-3 py-2.5 text-center transition-colors duration-100 ${
              pair === i ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2"}`}>
              <p className="text-[22px] font-bold leading-tight">{chordLabel(TWO.chords[i])}</p>
              <p className={`font-mono text-[14px] ${pair === i ? "text-[#2A2208]" : "text-muted"}`}>{names(ns)}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1.5 font-mono text-[13px] text-muted">a chord on every note, skipping every other note</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {TWO.stacks.map((s, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface2 px-1 py-1.5 text-center">
                <p className="font-mono text-[13px] text-cream/85">{names(s.notes)}</p>
                <p className="text-[15px] font-bold">{chordLabel(s.symbol)}</p>
              </div>
            ))}
          </div>
        </div>
      </>}>
      <p>
        Build a chord on each note of the Sunday Scale by skipping every other note. You only
        ever get two: {c0} ({names(TWO.chordNotes[0])}) and {c1} ({names(TWO.chordNotes[1])}),
        taking turns.
      </p>
      <Said>The hexatonic scale is just automatically making it two.</Said>
      <p>
        They share no note, and together they use all six. That is why Jason picks the tonic
        chord and the chord a step away: in {KEY} major, the only chords with no note in common
        with {KEY} are {listWords(strangers)}.
      </p>
    </Step>
  );
}

/* ── 3. every inversion ───────────────────────────────────────────────── */

const INV_BEATS = drillBeats(INV.steps);
const INV_PLAN = planFor(INV_BEATS, 0.62, false);

function InversionStep() {
  const { live, index } = useProof(INV_PLAN);
  const beat = index >= 0 ? INV_BEATS[index] ?? null : null;
  const [c0, c1] = TWO.chords.map(chordLabel);
  return (
    <Step n={3} id="inversions" title="Climb through every inversion."
      play={<PlayButton live={live} label="Hear the climb" />}
      practise={<PractiseLink href="/harmony?tab=pairs">two-triad pairs</PractiseLink>}
      visual={<>
        <FitKeyboard scale={S.sunday} removed={S.dropped} beat={beat} {...span(INV_BEATS)} />
        <DrillChips steps={INV.steps} index={index} />
      </>}>
      <p>
        Go up the scale one chord at a time: {c0}, {c1}, then both in first inversion, then
        both in second, and finish on {c0} an octave up. Every note of each chord moves up
        one note of the scale, so the chords make a tune.
      </p>
      <Said>It&rsquo;s almost like the chords are singing a tune.</Said>
      <p>Change chord on every beat, at the speed of a melody, not an accompaniment.</p>
    </Step>
  );
}

/* ── 4. the minor hexatonic ───────────────────────────────────────────── */

const MIN_BEATS = drillBeats(MIN.steps);
const MIN_PLAN = planFor(MIN_BEATS, 0.62, false);

function MinorStep() {
  const { live, index } = useProof(MIN_PLAN);
  const beat = index >= 0 ? MIN_BEATS[index] ?? null : null;
  const home = P(MIN.tonic);
  const [m0, m1] = MIN.movement.pairLabels;
  return (
    <Step n={4} id="minor" title="Make the minor chord home."
      play={<PlayButton live={live} label={`Hear ${home} minor and ${m1}`} />}
      practise={<PractiseLink href={`/practice?k=${MIN.movement.scale.tonic}&f=diatonic&m=4`}>{home} minor, six notes</PractiseLink>}
      visual={<>
        <FitKeyboard scale={MIN.scale} removed={null} beat={beat} {...span(MIN_BEATS)} />
        <DrillChips steps={MIN.steps} index={index} />
        <p className="font-mono text-[13px] text-muted">
          {home} minor pentatonic {names(MIN.pentatonic)} + {P(MIN.added)}
        </p>
      </>}>
      <p>
        Keep the same two chords but start on {m0}: {names(MIN.scale)}. That is Jason&rsquo;s
        minor hexatonic, the {home} minor pentatonic plus the 2, {P(MIN.added)}, and the same
        six notes as {KEY}&rsquo;s Sunday Scale.
      </p>
      <p>
        There is no 6th at all, and the 6th is the note that decides Dorian from Aeolian, so
        it can lean either way. Climb it the same way: {chordWords(m0)}, {m1} in first
        inversion, and on up.
      </p>
    </Step>
  );
}

/* ── 5. two chords make a mode ────────────────────────────────────────── */

const MODE_BEATS: Record<ModeId, Beat[]> = Object.fromEntries(
  MODES.map((m) => [m.id, drillBeats(MODAL[m.id].steps)])) as Record<ModeId, Beat[]>;
const MODE_PLANS: Record<ModeId, DrillPlan> = Object.fromEntries(
  MODES.map((m) => [m.id, planFor(MODE_BEATS[m.id], 0.62, true)])) as Record<ModeId, DrillPlan>;
const MODE_SPAN = span(MODES.flatMap((m) => MODE_BEATS[m.id]));

function ModesStep() {
  const [id, setId] = useState<ModeId>("dorian");
  const f = MODAL[id];
  const { live, index } = useProof(MODE_PLANS[id]);
  const beat = index >= 0 ? MODE_BEATS[id][index] ?? null : null;
  const [a, b] = f.chords.map(chordWords);
  const line = (m: (typeof MODES)[number]) => {
    const x = MODAL[m.id];
    return `${chordLabel(x.chords[0])} + ${chordLabel(x.chords[1])}`;
  };
  return (
    <Step n={5} id="modes" title="Change the pair, change the mode."
      play={<PlayButton live={live} label={`Hear ${KEY} ${f.mode.name}`} />}
      practise={<PractiseLink href={f.practiceHref}>{KEY} {f.mode.name}, six notes</PractiseLink>}
      visual={<>
        <div>
          <div className="seg grid w-full grid-cols-2 sm:inline-flex sm:w-max" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={id === m.id}
                      data-on={id === m.id} onClick={() => setId(m.id)}>{m.name}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ScaleRing notes={f.six} removed={f.dropped} size={132} showLabels={false} className="shrink-0" />
          <dl className="min-w-0 space-y-1.5 text-[15px]">
            <div><dt className="micro-caps">chords</dt>
              <dd className="text-[19px] font-bold leading-tight">{line(f.mode)}</dd>
              <dd className="font-mono text-[13px] text-muted">{f.mode.numerals}</dd></div>
            <div><dt className="micro-caps">six notes</dt><dd className="font-mono">{names(f.six)}</dd></div>
            <div><dt className="micro-caps">colour</dt>
              <dd>{names(f.colourNotes)} <span className="text-muted">· {f.mode.colourWords}</span></dd></div>
          </dl>
        </div>
        <FitKeyboard scale={f.six} removed={f.dropped} beat={beat} {...MODE_SPAN} />
        <DrillChips steps={f.steps} index={index} />
      </>}>
      <p>
        Swap one chord and the same drill gives you a mode. In {KEY}:{" "}
        {MODES.map((m, i) => (
          <span key={m.id}>{i > 0 && (i === MODES.length - 1 ? " and " : ", ")}
            {m.name} is {line(m)}</span>
        ))}.
      </p>
      <p>
        Each pair keeps the notes that give its mode its flavour. For {KEY} {f.mode.name} that
        is {f.mode.colourWords}, {listWords(f.colourNotes.map(P))}; the note left out is{" "}
        {P(f.dropped)}. {a} and {b} share no note.
      </p>
      <Said>Two chords to become a mode.</Said>
    </Step>
  );
}

/* ── 6. rhythm ────────────────────────────────────────────────────────── */

const RHYTHM_BPM = 84;
type G = (typeof GROUPINGS)[number];
/** The Sunday Scale straight up, over and over, 16ths in 4/4 with an accent
 *  every G notes, for exactly as many notes as it takes the first note, the
 *  accent and beat 1 to meet. Looping, so the next pass starts on the landing. */
function rhythmPlan(g: G): { plan: DrillPlan; notes: Note[]; bars: number } {
  const r = solveResolution(6, 4, 4, g, "full");
  const notes = Array.from({ length: r.totalNotes }, (_, i) => S.sunday[i % 6]);
  return {
    notes, bars: r.bars,
    plan: {
      notes, stepDur: 60 / RHYTHM_BPM / 4, grouping: g, subdivision: 4,
      beatsPerBar: 4, loop: true, click: true,
    },
  };
}
const RHYTHM = Object.fromEntries(GROUPINGS.map((g) => [g, rhythmPlan(g)])) as Record<G, ReturnType<typeof rhythmPlan>>;

function RhythmStep() {
  const [g, setG] = useState<G>(4);
  const r = RHYTHM[g];
  const live = useLiveDrill(r.plan, () => ({ countInBeats: 4, beatDur: 60 / RHYTHM_BPM }));
  const sounding = GROUPINGS.find((x) => live.position?.plan.notes === RHYTHM[x].plan.notes);
  const idx = sounding && live.position ? live.position.index : -1;
  const n = sounding ? RHYTHM[sounding].notes[idx] ?? null : null;
  const accent = sounding ? idx % sounding === 0 : false;
  const row = RHY.find((x) => x.grouping === g)!;
  return (
    <Step n={6} id="rhythm" title="Accent it in threes, fours and fives."
      play={<PlayButton live={live} label={`Hear groups of ${g}`} />}
      practise={<PractiseLink href={`/practice?k=G&f=diatonic&m=3&g=${g}&v=2`}>groups of {g}</PractiseLink>}
      visual={<>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="seg" role="radiogroup" aria-label="Accent every">
            {GROUPINGS.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={g === x}
                      data-on={g === x} onClick={() => setG(x)}>in {x}s</button>
            ))}
          </div>
          <BeatCounter at={live.position} beats={4} bars={sounding ? RHYTHM[sounding].bars : r.bars}
                       countdown={live.countdown} />
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="the six notes">
          {S.sunday.map((x) => (
            <NoteChip key={x.letter} label={P(x)} lit={!!n && pc(n) === pc(x)} />
          ))}
          <span className={`ml-1 self-center font-mono text-[13px] ${accent ? "text-cream" : "text-muted"}`}>
            {accent ? "accent" : " "}
          </span>
        </div>
        <table className="w-full text-[15px]">
          <caption className="sr-only">Bars of 16th notes in 4/4 until the scale, the accent and beat 1 line up again</caption>
          <thead>
            <tr className="text-left font-mono text-[13px] text-muted">
              <th scope="col" className="pb-1.5 pr-3 font-normal">accent every</th>
              <th scope="col" className="pb-1.5 pr-3 text-right font-normal">six notes</th>
              <th scope="col" className="pb-1.5 text-right font-normal">seven notes</th>
            </tr>
          </thead>
          <tbody>
            {RHY.map((x) => (
              <tr key={x.grouping} className={`border-t border-line/70 ${x.grouping === g ? "text-cream" : "text-muted"}`}>
                <td className="py-1.5 pr-3">{x.grouping} notes</td>
                <td className="py-1.5 pr-3 text-right font-bold tabular-nums">{x.six} bars</td>
                <td className="py-1.5 text-right tabular-nums">{x.seven} bars</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>}>
      <p>
        Jason has students run the scale with an accent every three, four or five notes.
        Six splits into 2s and 3s, so the scale, the accent and beat 1 meet again quickly.
      </p>
      <p>
        In 16ths over 4/4, groups of {g} on these six notes land in {row.six} bars. The seven-note
        major scale needs {row.seven}. Start in fours; when they are easy, Jason&rsquo;s
        upgrade is threes or fives.
      </p>
    </Step>
  );
}

/* ── 7. how to practise ───────────────────────────────────────────────── */

const pairRun = (i: number): (Note | null)[] => {
  const p = PAIRS[i];
  return [...sundayRun(p.sharp), null, ...sundayRun(p.flat), null, null];
};
const PAIR_NOTES = PAIRS.map((_, i) => pairRun(i));
const PAIR_PLANS = PAIR_NOTES.map((ns) => planFor(notesToBeats(ns), 0.26, true));
const PAIR_SPAN = span(PAIR_PLANS.flatMap((p) => p.chords!));

function PractiseStep() {
  const [i, setI] = useState(0);
  const { live, index } = useProof(PAIR_PLANS[i]);
  const p = PAIRS[i];
  const n = index >= 0 ? PAIR_NOTES[i][index] ?? null : null;
  const sharpLen = sundayRun(p.sharp).length + 1;
  const inFlat = index >= sharpLen;
  const sharpSix = sundayRun(p.sharp).slice(0, 6);
  const flatSix = sundayRun(p.flat).slice(0, 6);
  const count = (c: number, sign: string) => `${c} ${sign}${c === 1 ? "" : "s"}`;
  const [c0, c1] = TWO.chords.map(chordLabel);
  return (
    <Step n={7} id="practise" title="Practise it like this."
      play={<PlayButton live={live} label={`Hear ${pretty(p.sharp)}, then ${pretty(p.flat)}`} />}
      practise={<PractiseLink href={`/practice?k=${encodeURIComponent(p.sharp)}&f=diatonic&m=3`}>{pretty(p.sharp)} Sunday Scale</PractiseLink>}
      visual={<>
        <div>
          <p className="mb-1.5 font-mono text-[13px] text-muted">pair keys by key signature</p>
          <div>
            <div className="seg grid w-full grid-cols-3 sm:inline-flex sm:w-max" role="radiogroup" aria-label="Key pair">
              {PAIRS.map((x, j) => (
                <button key={x.count} type="button" role="radio" aria-checked={i === j}
                        data-on={i === j} onClick={() => setI(j)}>{pretty(x.sharp)} · {pretty(x.flat)}</button>
              ))}
            </div>
          </div>
        </div>
        <FitKeyboard scale={inFlat ? flatSix : sharpSix} removed={null}
                     beat={n ? [midi(n)] : null} {...PAIR_SPAN} />
        <div className="space-y-2">
          {[{ k: p.sharp, six: sharpSix, on: !inFlat, sig: count(p.count, "sharp") },
            { k: p.flat, six: flatSix, on: inFlat, sig: count(p.count, "flat") }].map((r) => (
            <div key={r.k}>
              <p className="mb-1 font-mono text-[13px] text-muted">{pretty(r.k)} · {r.sig}</p>
              <div className="flex flex-wrap gap-1.5">
                {r.six.map((x) => (
                  <NoteChip key={x.letter} label={P(x)} lit={r.on && !!n && pc(n) === pc(x)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </>}>
      <ol className="list-none space-y-2">
        {[
          `Start with one chord through its inversions, then the other, then alternate them: ${c0} alone, ${c1} alone, then ${c0} and ${c1} in turn.`,
          "One hand plays the scale while the other plays the two chords. Stick to just those two.",
          "Change chord on every beat. Mostly the first three fingers; one octave first, then two.",
          "Every key. Pair a sharp key with the flat key that has as many flats: two sharps (D) with two flats (B♭).",
        ].map((t, j) => (
          <li key={j} className="flex gap-3">
            <span className="mt-0.5 font-mono text-[13px] tabular-nums text-muted">{j + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <Said>You need to practice this on all keys ideally.</Said>
    </Step>
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */

const CONTENTS: [string, string][] = [
  ["six", "Six notes"], ["two", "Two chords"], ["inversions", "Inversions"],
  ["minor", "Minor"], ["modes", "Modes"], ["rhythm", "Rhythm"], ["practise", "Practise"],
];

export default function LearnClient() {
  return (
    <div className="space-y-5 pb-12">
      <header className="max-w-3xl pt-2">
        <p className="eyebrow">Learn</p>
        <h1 className="display mt-3 text-[42px] sm:text-[58px]">Why six notes</h1>
        <p className="pull mt-4 max-w-xl">
          Leave one note out of a major scale and it turns into two chords.
        </p>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-cream/80">
          Jason Zac&rsquo;s hexatonic lesson in seven steps, in his order, with every example
          in {KEY}. Gold lights what you are hearing; red marks the note left out.
        </p>
        <nav aria-label="Steps" className="mt-4">
          <ol className="flex flex-wrap gap-1.5">
            {CONTENTS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`}
                   className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2.5 text-[14px] text-cream/85 transition-colors hover:border-line-control hover:text-cream">
                  <span className="font-mono text-[13px] text-muted">{i + 1}</span>{label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <SweetSpotStep />
      <TwoChordsStep />
      <InversionStep />
      <MinorStep />
      <ModesStep />
      <RhythmStep />
      <PractiseStep />

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="next" className="card p-4 sm:p-6">
          <p className="eyebrow">Next</p>
          <h2 id="next" className="display mt-1.5 text-[24px]">The same idea with eight notes</h2>
          <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-cream/80">
            <p>
              Jason ends the lesson with Barry Harris&rsquo;s sixth-diminished scales: two
              four-note chords in place of two triads.
            </p>
            <Said>So hexatonic scales are a good study for triads as a pair. Octatonic scales are a very good study for two seventh chords as a pair.</Said>
          </div>
          <div className="mt-3">
            <Link href="/harmony?tab=sixth"
                  className="group inline-flex min-h-[44px] items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/85 hover:text-cream">
              <span className="underline decoration-cream/30 underline-offset-4 group-hover:decoration-cream">Sixth–diminished</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
        <section aria-labelledby="source" className="card p-4 sm:p-6">
          <p className="eyebrow">Where this comes from</p>
          <h2 id="source" className="display mt-1.5 text-[24px]">Jason&rsquo;s lesson</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-cream/80">
            These steps follow Jason Zac&rsquo;s YouTube lesson{" "}
            <a href={VIDEO} target="_blank" rel="noopener noreferrer"
               className="text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">
              {VIDEO_TITLE}
            </a>
            , his notes for it, and his teaching at Nathaniel School of Music. He teaches the
            Sunday Scale in B♭ and the minor one in A; here it all starts in {KEY}. The quotes
            are his own words.
          </p>
        </section>
      </div>
    </div>
  );
}
