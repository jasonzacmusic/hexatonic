"use client";

/**
 * Sounds: the variety page. Every six-note family and mode, grouped by how you
 * reach six notes, then the colour scales and the world scales (5 and 7
 * notes). Each has a play button, its ring shape and a Practise link, in the
 * key chosen on the sticky key bar.
 *
 * Everything shown is computed: names, degrees and characters come from
 * src/lib/theory/scales.ts, "other names" and "one note away" from
 * src/lib/theory/workout.ts, and the knock-one-out table counts real tritones.
 *
 * Playback rule: changing the key (or the knock-out parent) never silences a
 * sound that is playing. The same sound carries on in the new key: every
 * playable registers its notes under a key-independent id while it renders,
 * and after the change the sounding id is played again from its new notes.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KEYS, DIATONIC_MODES, FAMILY_GROUPS, buildScale, familyById, familiesIn, prettyDegree,
  ScaleInstance,
} from "@/lib/theory/scales";
import { Note, midi, notePretty, pc } from "@/lib/theory/note";
import { decodeCustom } from "@/lib/theory/custom";
import { decodeState } from "@/lib/useDrill";
import {
  PARENTS, knockOut, identify, neighbours, maskOf, practiceQuery, pcsOf,
} from "@/lib/theory/workout";
import { PlayGlyph, litIndex, upToOctave, usePreviewRun, Lit } from "@/components/ScalePreview";
import ScaleRing from "@/components/ScaleRing";
import KeyPicker, { prettyKey as PRETTY_KEY } from "@/components/KeyPicker";

const DEFAULT_KEY = "G";
const SPREAD = 0.26;

/** The order a player meets the rotations: brightest major to darkest minor. */
const MODE_ORDER = [0, 3, 4, 2, 1, 5];

/** The groups in page order, with the short names used by the jump links. */
const GROUPS: { id: string; short: string }[] = [
  { id: "remove", short: "Remove one" },
  { id: "pentatonic", short: "Pentatonic + 1" },
  { id: "symmetric", short: "Symmetric" },
  { id: "colour", short: "Colour" },
  { id: "beyond", short: "World" },
  { id: "custom", short: "Custom" },
];

interface Entry {
  id: string;
  name: string;
  character: string;
  colour: string;
  scale: ScaleInstance;
  practice: string;
}

function entryFor(key: string, famId: string, mode = 0): Entry {
  const scale = buildScale(key, famId, mode);
  const fam = familyById(famId);
  const md = fam.kind === "rotation" ? DIATONIC_MODES[mode] : null;
  const q = new URLSearchParams({ k: key, f: famId });
  if (md) q.set("m", String(mode));
  return {
    id: `${famId}-${mode}`,
    name: md ? md.name : fam.short,
    character: md ? md.character : fam.character,
    colour: md ? md.colour : (fam.note ?? ""),
    scale,
    practice: `/practice?${q}`,
  };
}

type Player = ReturnType<typeof usePreviewRun> & {
  /** Record what `id` plays in the current key. Called while rendering. */
  register: (id: string, midis: number[], spread: number) => void;
};

export default function SoundsClient() {
  const [key, setKey] = useState(DEFAULT_KEY);
  const [parent, setParentRaw] = useState("major");
  const run = usePreviewRun();
  const reg = useRef<Record<string, { midis: number[]; spread: number }>>({});
  const replay = useRef<string | null>(null);
  reg.current = {};
  const player: Player = {
    ...run,
    register: (id, midis, spread) => { reg.current[id] = { midis, spread }; },
  };
  const sounding = run.lit?.id ?? run.pending;

  // the key lives in the URL so a link opens on the same page
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("k");
    if (k && KEYS.includes(k)) setKey(k);
  }, []);
  const pickKey = (k: string) => {
    replay.current = sounding;
    setKey(k);
    const q = k === DEFAULT_KEY ? "" : `?k=${encodeURIComponent(k)}`;
    window.history.replaceState(null, "", `${window.location.pathname}${q}${window.location.hash}`);
  };
  const setParent = (p: string) => { replay.current = sounding; setParentRaw(p); };

  /* Once a key or parent change has rendered, carry on with whatever was
     sounding, from its notes in the new key. */
  const { play } = run;
  useEffect(() => {
    const id = replay.current;
    replay.current = null;
    const r = id ? reg.current[id] : undefined;
    if (id && r) void play(id, r.midis, r.spread);
  }, [key, parent, play]);

  const remove = useMemo(() => [
    ...MODE_ORDER.map((m) => entryFor(key, "diatonic", m)),
    entryFor(key, "mixo"),
  ], [key]);
  const penta = useMemo(() => familiesIn("pentatonic").map((f) => entryFor(key, f.id)), [key]);
  const symmetric = useMemo(() => familiesIn("symmetric").map((f) => entryFor(key, f.id)), [key]);
  const colour = useMemo(() => familiesIn("colour").map((f) => entryFor(key, f.id)), [key]);
  const world = useMemo(() => familiesIn("beyond").map((f) => entryFor(key, f.id)), [key]);
  const rows = useMemo(() => knockOut(key, parent), [key, parent]);
  const parentDef = PARENTS.find((p) => p.id === parent)!;

  const group = (id: string) => FAMILY_GROUPS.find((g) => g.id === id)!;
  const jump = (cls: string) => (
    <nav aria-label="Groups" className={cls}>
      {GROUPS.map((g) => <a key={g.id} href={`#${g.id}`} className="link-gold">{g.short}</a>)}
    </nav>
  );

  return (
    <div className="-mb-16">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 pt-1">
        <div>
          <p className="eyebrow">Sounds</p>
          <h1 className="display mt-2 text-[40px] sm:text-5xl lg:text-[56px]">
            Every <span className="whitespace-nowrap">six-note</span> sound.
          </h1>
        </div>
        <p className="quiet max-w-[46ch] lg:pb-1">
          Tap any one to hear it. Each is spelled the way a player reads it in the key
          you pick, and is one tap away from Practice.
        </p>
      </header>

      {/* The key bar stays under the nav as you scroll, so changing key is one
          tap from anywhere on the page. */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-30 lg:top-[calc(env(safe-area-inset-top)+58px)] -mx-5 mt-4 border-b border-line/70 bg-bg/90 px-5 py-2.5 backdrop-blur-xl sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <KeyPicker value={key} onChange={pickKey} size="sm" className="w-full sm:w-auto" />
          {jump("hidden flex-wrap gap-x-4 gap-y-1 xl:flex")}
        </div>
      </div>
      {jump("mt-3 flex flex-wrap gap-x-4 gap-y-1.5 xl:hidden")}

      {/* ── remove one note ─────────────────────────────────────────────── */}
      <Group id="remove" title={group("remove").label} blurb={group("remove").blurb} first>
        <Cards entries={remove} player={player}
               extra={<KnockOut keyName={key} parent={parent} setParent={setParent} rows={rows}
                                note={parentDef.note} player={player} />} />
      </Group>

      {/* Two small groups of two share a row on a wide screen. */}
      <div className="xl:grid xl:grid-cols-2 xl:gap-x-8">
      {/* ── pentatonic plus one ─────────────────────────────────────────── */}
      <Group id="pentatonic" title={group("pentatonic").label} blurb={group("pentatonic").blurb}>
        <Cards entries={penta} player={player} two />
        <p className="quiet mt-3">
          Two more are in the first group: {DIATONIC_MODES[4].name} is the minor
          pentatonic plus the 2nd, and {DIATONIC_MODES[0].name} is the major pentatonic
          plus the 7th.
        </p>
      </Group>

      {/* ── symmetric ───────────────────────────────────────────────────── */}
      <Group id="symmetric" title={group("symmetric").label} blurb={group("symmetric").blurb}>
        <Cards entries={symmetric} player={player} two />
      </Group>
      </div>

      {/* ── colour scales ───────────────────────────────────────────────── */}
      <Group id="colour" title={group("colour").label} blurb={group("colour").blurb}>
        <Cards entries={colour} player={player} />
      </Group>

      {/* ── world scales, 5 and 7 notes ─────────────────────────────────── */}
      <Group id="beyond" title={group("beyond").label} blurb={group("beyond").blurb}>
        <Cards entries={world} player={player} />
      </Group>

      {/* ── custom ──────────────────────────────────────────────────────── */}
      <Group id="custom" title={group("custom").label} blurb={group("custom").blurb}>
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <p className="quiet max-w-[52ch]">
            Choose any six notes and Practice spells them, finds the chords inside them and
            counts the bars, exactly as it does for the named scales.
          </p>
          <Link href={`/practice?${new URLSearchParams({ k: key, f: "custom" })}`} className="btn btn-primary">
            Build your own
          </Link>
        </div>
      </Group>
    </div>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function Group({ id, title, blurb, children, first = false }: {
  id: string; title: string; blurb: string; children: React.ReactNode; first?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`}
             className={`scroll-mt-[200px] sm:scroll-mt-[150px] ${first ? "mt-5" : "mt-10 border-t border-line pt-7"}`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id={`${id}-h`} className="display text-[28px] sm:text-[34px]">{title}</h2>
        <p className="quiet">{blurb}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A grid of cards. `extra` fills the rest of the last row (two columns wide);
 *  `two` keeps it at two columns for a half-width group. */
function Cards({ entries, player, extra, two = false }: {
  entries: Entry[]; player: Player; extra?: React.ReactNode; two?: boolean;
}) {
  return (
    <ul className={`grid gap-2.5 sm:grid-cols-2 ${two ? "lg:grid-cols-3 xl:grid-cols-2" : "lg:grid-cols-3"} ${
      extra ? "lg:[&>li:nth-last-child(2)]:items-start" : ""}`}>
      {entries.map((e) => <li key={e.id} className="flex max-w-none"><Card e={e} player={player} /></li>)}
      {extra && <li className="flex max-w-none sm:col-span-2">{extra}</li>}
    </ul>
  );
}

function PlayButton({ on, label, onClick, big = false }: {
  on: boolean; label: string; onClick: () => void; big?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={on}
            className={`grid shrink-0 place-items-center rounded-full border transition-[background-color,border-color,transform] duration-150 active:scale-95 ${
              big ? "h-10 w-10" : "h-8 w-8"} ${
              on ? "border-gold bg-gold text-[#17130a]" : "border-line-control/70 bg-surface2 text-cream hover:border-cream/60"}`}>
      <PlayGlyph playing={on} size={big ? 13 : 11} />
    </button>
  );
}

const isOn = (p: Player, id: string) => p.lit?.id === id || p.pending === id;

/** Register a scale run under `id` and return its play/stop handler. */
const runOf = (p: Player, id: string, notes: Note[]) => {
  const midis = upToOctave(notes.map(midi));
  p.register(id, midis, SPREAD);
  return () => (isOn(p, id) ? p.stop() : void p.play(id, midis, SPREAD));
};

function Dots({ notes, lit, id }: { notes: Note[]; lit: Lit | null; id: string }) {
  const idx = litIndex(lit, id, notes.length);
  return (
    <span className="flex flex-wrap gap-1">
      {notes.map((n, i) => (
        <span key={i} className={`note-dot text-[14px] ${idx === i ? "is-lit" : ""}`}>{notePretty(n)}</span>
      ))}
    </span>
  );
}

function Card({ e, player }: { e: Entry; player: Player }) {
  const on = isOn(player, e.id);
  const s = e.scale;
  const tap = runOf(player, e.id, s.notes);
  const idx = litIndex(player.lit, e.id, s.notes.length);
  const mask = maskOf(s.pcs);
  const selfName = `${PRETTY_KEY(s.tonic)} ${e.name}`;
  const others = identify(mask).map((x) => x.name).filter((n) => n !== selfName);
  const near = neighbours(mask).slice(0, 6);
  const count = s.notes.length;
  const hasMore = others.length > 0 || near.length > 0;
  const [more, setMore] = useState(false);
  return (
    <article className={`card flex w-full flex-col p-4 sm:p-5 ${on ? "border-gold/60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[19px] italic leading-none text-cream/75">
            {e.character}
            {count !== 6 && <span className="ml-2 font-mono text-[13px] not-italic text-muted">{count} notes</span>}
          </p>
          <h3 className="mt-1.5 text-[21px] font-extrabold leading-tight tracking-[-0.015em]">{e.name}</h3>
          <p className="mt-1 font-mono text-[13px] tracking-[0.02em] text-muted">
            {s.degrees.map(prettyDegree).join("  ")}
          </p>
          <div className="mt-2.5"><Dots notes={s.notes} lit={player.lit} id={e.id} /></div>
        </div>
        {/* the shape, with its play button in the middle */}
        <ScaleRing notes={s.notes} removed={s.removed} size="sm"
                   className="-mr-1 -mt-1 !w-[104px] sm:!w-[112px]"
                   activePc={idx === null ? null : pc(s.notes[idx])}>
          <span className="pointer-events-auto">
            <PlayButton on={on} label={`${on ? "Stop" : "Play"} ${selfName}`} onClick={tap} big />
          </span>
        </ScaleRing>
      </div>
      {s.respelledFrom && (
        <p className="micro mt-2">Written from {PRETTY_KEY(s.tonic)}: in {PRETTY_KEY(s.respelledFrom)} it would need double flats.</p>
      )}
      <p className="quiet mt-2.5 flex-1">{e.colour}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Link href={e.practice} className="btn btn-ghost px-3.5 py-2 text-[14px]">Practise this →</Link>
        {hasMore && (
          <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-controls={`${e.id}-more`}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75 transition-colors hover:text-cream">
            Related scales
            <span aria-hidden="true" className={`inline-block transition-transform duration-200 ${more ? "rotate-45" : ""}`}>+</span>
          </button>
        )}
      </div>

      {hasMore && more && (
        <div id={`${e.id}-more`} className="mt-3 border-t border-line pt-1">
          {others.length > 0 && (
            <div className="mt-3">
              <p className="micro-caps">Same notes</p>
              <p className="mt-1 text-[15px] leading-relaxed text-cream/85">{others.slice(0, 5).join(" · ")}</p>
            </div>
          )}
          {near.length > 0 && (
            <div className="mt-4">
              <p className="micro-caps">One note away</p>
              <ul className="mt-1.5 space-y-1">
                {near.map((n, i) => (
                  <Neighbour key={n.mask} from={s} n={n} player={player} id={`${e.id}~${i}`} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Build a catalogued scale from its Practice query, for its spelling. */
function scaleFromQuery(q: string): ScaleInstance {
  const st = decodeState(q);
  return st.family === "custom"
    ? buildScale(st.key, "custom", 0, decodeCustom(st.custom))
    : buildScale(st.key, st.family, st.mode);
}

function Neighbour({ from, n, player, id }: {
  from: ScaleInstance; n: ReturnType<typeof neighbours>[number]; player: Player; id: string;
}) {
  const theirs = scaleFromQuery(n.names[0].practice);
  const dropNote = from.notes.find((x) => pc(x) === n.drop);
  const addNote = theirs.notes.find((x) => pc(x) === n.add);
  const on = isOn(player, id);
  // yours, then theirs, from the same tonic
  const base = midi(from.notes[0]);
  const lift = (p: number) => base + ((((p - pc(from.notes[0])) % 12) + 12) % 12);
  const both = [...from.notes.map(midi), ...pcsOf(n.mask).map(lift).sort((a, b) => a - b)];
  player.register(id, both, 0.2);
  const compare = () => (on ? player.stop() : void player.play(id, both, 0.2));
  return (
    <li className="flex items-center gap-2.5 py-1">
      <PlayButton on={on} label={`Play yours, then ${n.names[0].name}`} onClick={compare} />
      <span className="w-[5.5rem] shrink-0 font-mono text-[14px]">
        <span className="text-red">{dropNote ? notePretty(dropNote) : "?"}</span>
        <span className="text-muted"> → </span>
        <span className="text-cream">{addNote ? notePretty(addNote) : "?"}</span>
      </span>
      <Link href={`/practice?${n.names[0].practice}`}
            className="min-w-0 flex-1 truncate text-[15px] text-cream/85 underline decoration-transparent underline-offset-4 transition-colors hover:decoration-cream/50">
        {n.names[0].name}
      </Link>
    </li>
  );
}

function KnockOut({ keyName, parent, setParent, rows, note, player }: {
  keyName: string; parent: string; setParent: (p: string) => void;
  rows: ReturnType<typeof knockOut>; note: string; player: Player;
}) {
  return (
    <div className="card w-full p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-[21px] font-extrabold leading-tight tracking-[-0.015em]">
            Which note do you take out?
          </h3>
          <p className="quiet mt-1">Remove each note in turn and count the tritones left.</p>
        </div>
        {/* Selected is cream, like the key picker: gold only means "sounding now". */}
        <div className="inline-flex flex-wrap gap-[3px] rounded-xl border border-line-control/70 bg-surface2 p-[3px]"
             role="group" aria-label="Seven-note parent">
          {PARENTS.map((p) => {
            const sel = p.id === parent;
            return (
              <button key={p.id} type="button" aria-pressed={sel} onClick={() => setParent(p.id)}
                      className={`rounded-lg px-3 py-1.5 text-[15px] transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                        sel ? "bg-cream font-semibold text-[#17130a] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.5)]"
                            : "text-cream/75 hover:bg-white/[0.06] hover:text-cream"}`}>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
      <p className="quiet mt-2">{note}</p>

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {rows.map((r) => {
          const id = `ko-${r.removedIndex}`;
          const on = isOn(player, id);
          const tap = runOf(player, id, r.notes);
          const named = identify(r.mask).find((e) => e.rank < 1000 && e.tonic === keyName);
          const href = `/practice?${named ? named.practice : practiceQuery(keyName, r.semis)}`;
          const clean = r.tritones === 0;
          return (
            <li key={r.removedIndex} className="grid max-w-none grid-cols-[3.75rem_1fr] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[6rem_1fr_11rem_auto]">
              <span className="font-mono text-[14px]">
                <span className="text-red">−{prettyDegree(r.removedDegree)}</span>
                <span className="ml-1.5 text-muted">{notePretty(r.removedNote)}</span>
              </span>
              <span className="min-w-0"><Dots notes={r.notes} lit={player.lit} id={id} /></span>
              {/* on a phone the count and the buttons share the second line */}
              <span className="col-start-2 flex items-center justify-between gap-3 sm:contents">
                <span className={`font-mono text-[13px] ${clean ? "text-cream" : "text-muted"}`}>
                  {clean ? "no tritone" : `${r.tritones} tritone${r.tritones === 1 ? "" : "s"}`}
                  {named && <span className="block text-muted">{named.name.replace(/^\S+\s/, "")}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <PlayButton on={on} label={`Play ${keyName} without ${r.removedDegree}`} onClick={tap} />
                  <Link href={href} className="btn btn-ghost px-3 py-1.5 text-[13px]" aria-label={`Practise ${keyName} without ${r.removedDegree}`}>
                    Practise
                  </Link>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
