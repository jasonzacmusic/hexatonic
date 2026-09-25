"use client";

/**
 * Sounds: the variety page. Every six-note family and mode, grouped by how you
 * reach six notes, each playable in the chosen key and one tap from Practice.
 *
 * Everything shown is computed: names, degrees and characters come from
 * src/lib/theory/scales.ts, "other names" and "one note away" from
 * src/lib/theory/workout.ts, and the knock-one-out table counts real tritones.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const PRETTY_KEY = (k: string) => k.replace(/#/g, "♯").replace(/b/g, "♭");
const DEFAULT_KEY = "G";

/** The order a player meets the rotations: brightest major to darkest minor. */
const MODE_ORDER = [0, 3, 4, 2, 1, 5];

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

type Player = ReturnType<typeof usePreviewRun>;

export default function SoundsClient() {
  const [key, setKey] = useState(DEFAULT_KEY);
  const [parent, setParent] = useState("major");
  const player = usePreviewRun();

  // the key lives in the URL so a link opens on the same page
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("k");
    if (k && KEYS.includes(k)) setKey(k);
  }, []);
  const pickKey = (k: string) => {
    setKey(k);
    player.stop();
    const q = k === DEFAULT_KEY ? "" : `?k=${encodeURIComponent(k)}`;
    window.history.replaceState(null, "", `${window.location.pathname}${q}`);
  };

  const remove = useMemo(() => [
    ...MODE_ORDER.map((m) => entryFor(key, "diatonic", m)),
    entryFor(key, "mixo"),
  ], [key]);
  const penta = useMemo(() => familiesIn("pentatonic").map((f) => entryFor(key, f.id)), [key]);
  const symmetric = useMemo(() => familiesIn("symmetric").map((f) => entryFor(key, f.id)), [key]);
  const beyond = useMemo(() => familiesIn("beyond").map((f) => entryFor(key, f.id)), [key]);
  const rows = useMemo(() => knockOut(key, parent), [key, parent]);
  const parentDef = PARENTS.find((p) => p.id === parent)!;

  const group = (id: string) => FAMILY_GROUPS.find((g) => g.id === id)!;

  return (
    <div className="pb-10">
      <header className="max-w-3xl pt-2">
        <p className="eyebrow">Sounds</p>
        <h1 className="display mt-3 text-[44px] sm:text-6xl">Every <span className="whitespace-nowrap">six-note</span> sound.</h1>
        <p className="lede mt-5">
          Tap any one to hear it. Each is shown in the key you pick, spelled the way a
          player reads it, and one tap away from Practice.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="micro-caps" id="key-label">Key</span>
        <div className="seg flex-wrap" role="group" aria-labelledby="key-label">
          {KEYS.map((k) => (
            <button key={k} type="button" data-on={k === key} aria-pressed={k === key}
                    onClick={() => pickKey(k)} className="min-w-[40px] font-mono">
              {PRETTY_KEY(k)}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label="Groups" className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        {["remove", "pentatonic", "symmetric", "custom", "beyond"].map((g) => (
          <a key={g} href={`#${g}`} className="link-gold">{group(g).label}</a>
        ))}
      </nav>

      {/* ── remove one note ─────────────────────────────────────────────── */}
      <Group id="remove" title={group("remove").label} blurb={group("remove").blurb}>
        <Cards entries={remove} player={player} />
        <KnockOut keyName={key} parent={parent} setParent={setParent} rows={rows}
                  note={parentDef.note} player={player} />
      </Group>

      {/* ── pentatonic plus one ─────────────────────────────────────────── */}
      <Group id="pentatonic" title={group("pentatonic").label} blurb={group("pentatonic").blurb}>
        <Cards entries={penta} player={player} />
        <p className="quiet mt-5">
          Two more are in the first group: {DIATONIC_MODES[4].name} is the minor
          pentatonic plus the 2nd, and {DIATONIC_MODES[0].name} is the major pentatonic
          plus the 7th.
        </p>
      </Group>

      {/* ── symmetric ───────────────────────────────────────────────────── */}
      <Group id="symmetric" title={group("symmetric").label} blurb={group("symmetric").blurb}>
        <Cards entries={symmetric} player={player} />
      </Group>

      {/* ── custom ──────────────────────────────────────────────────────── */}
      <Group id="custom" title={group("custom").label} blurb={group("custom").blurb}>
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <p className="quiet max-w-[52ch]">
            Choose any six notes and Practice spells them, finds the chords inside them and
            counts the bars, exactly as it does for the named scales.
          </p>
          <Link href={`/practice?${new URLSearchParams({ k: key, f: "custom" })}`} className="btn btn-primary">
            Build your own
          </Link>
        </div>
      </Group>

      {/* ── beyond six notes ────────────────────────────────────────────── */}
      <Group id="beyond" title={group("beyond").label} blurb={group("beyond").blurb}>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {beyond.map((e) => <BeyondRow key={e.id} e={e} player={player} />)}
        </ul>
      </Group>
    </div>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function Group({ id, title, blurb, children }: {
  id: string; title: string; blurb: string; children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-16 scroll-mt-24 border-t border-line pt-10">
      <h2 id={`${id}-h`} className="display text-3xl sm:text-4xl">{title}</h2>
      <p className="quiet mt-2">{blurb}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Cards({ entries, player }: { entries: Entry[]; player: Player }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((e) => <li key={e.id} className="flex max-w-none"><Card e={e} player={player} /></li>)}
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
              on ? "border-gold bg-gold text-[#17130a]" : "border-line-control/70 text-cream hover:border-cream/60"}`}>
      <PlayGlyph playing={on} size={big ? 13 : 11} />
    </button>
  );
}

const isOn = (p: Player, id: string) => p.lit?.id === id || p.pending === id;
const toggle = (p: Player, id: string, notes: Note[]) =>
  isOn(p, id) ? p.stop() : void p.play(id, upToOctave(notes.map(midi)), 0.26);

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
  const mask = maskOf(s.pcs);
  const selfName = `${PRETTY_KEY(s.tonic)} ${e.name}`;
  const others = identify(mask).map((x) => x.name).filter((n) => n !== selfName);
  const near = neighbours(mask).slice(0, 6);
  return (
    <article className={`card flex w-full flex-col ${on ? "border-gold/60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-serif text-[20px] italic leading-none text-cream/75">{e.character}</span>
        <PlayButton on={on} label={`${on ? "Stop" : "Play"} ${selfName}`} onClick={() => toggle(player, e.id, s.notes)} big />
      </div>
      <h3 className="mt-2 text-[22px] font-extrabold leading-tight tracking-[-0.015em]">{e.name}</h3>
      <p className="mt-1 font-mono text-[13px] tracking-[0.02em] text-muted">
        {s.degrees.map(prettyDegree).join("  ")}
      </p>
      <div className="mt-3"><Dots notes={s.notes} lit={player.lit} id={e.id} /></div>
      {s.respelledFrom && (
        <p className="micro mt-2">Written from {PRETTY_KEY(s.tonic)}: in {PRETTY_KEY(s.respelledFrom)} it would need double flats.</p>
      )}
      <p className="quiet mt-3 flex-1">{e.colour}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={e.practice} className="btn btn-ghost px-3.5 py-2 text-[14px]">Practise this →</Link>
      </div>

      {(others.length > 0 || near.length > 0) && (
        <details className="group mt-4 border-t border-line pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75 transition-colors hover:text-cream [&::-webkit-details-marker]:hidden">
            Other names · one note away
            <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-45">+</span>
          </summary>
          {others.length > 0 && (
            <div className="mt-3">
              <p className="micro-caps">Same six notes</p>
              <p className="mt-1 text-[15px] leading-relaxed text-cream/85">{others.slice(0, 5).join(" · ")}</p>
            </div>
          )}
          {near.length > 0 && (
            <div className="mt-4">
              <p className="micro-caps">One note away</p>
              <ul className="mt-1.5 space-y-1">
                {near.map((n) => (
                  <Neighbour key={n.mask} from={s} n={n} player={player} baseId={e.id} />
                ))}
              </ul>
            </div>
          )}
        </details>
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

function Neighbour({ from, n, player, baseId }: {
  from: ScaleInstance; n: ReturnType<typeof neighbours>[number]; player: Player; baseId: string;
}) {
  const id = `${baseId}~${n.mask}`;
  const theirs = scaleFromQuery(n.names[0].practice);
  const dropNote = from.notes.find((x) => pc(x) === n.drop);
  const addNote = theirs.notes.find((x) => pc(x) === n.add);
  const on = isOn(player, id);
  const compare = () => {
    if (on) { player.stop(); return; }
    const base = midi(from.notes[0]);
    const lift = (p: number) => base + ((((p - pc(from.notes[0])) % 12) + 12) % 12);
    const mine = from.notes.map(midi);
    const other = pcsOf(n.mask).map(lift).sort((a, b) => a - b);
    void player.play(id, [...mine, ...other], 0.2);
  };
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
    <div className="card mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-[22px] font-extrabold leading-tight tracking-[-0.015em]">
            Which note do you take out?
          </h3>
          <p className="quiet mt-1.5">Remove each note in turn and count the tritones left.</p>
        </div>
        <div className="seg flex-wrap" role="group" aria-label="Seven-note parent">
          {PARENTS.map((p) => (
            <button key={p.id} type="button" data-on={p.id === parent} aria-pressed={p.id === parent}
                    onClick={() => setParent(p.id)}>{p.name}</button>
          ))}
        </div>
      </div>
      <p className="quiet mt-3">{note}</p>

      <ul className="mt-5 divide-y divide-line border-y border-line">
        {rows.map((r) => {
          const id = `ko-${parent}-${r.removedIndex}`;
          const on = isOn(player, id);
          const named = identify(r.mask).find((e) => e.rank < 1000 && e.tonic === keyName);
          const href = `/practice?${named ? named.practice : practiceQuery(keyName, r.semis)}`;
          const clean = r.tritones === 0;
          return (
            <li key={r.removedIndex} className="grid max-w-none grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[7rem_1fr_9rem_auto]">
              <span className="font-mono text-[14px]">
                <span className="text-red">−{prettyDegree(r.removedDegree)}</span>
                <span className="ml-1.5 text-muted">{notePretty(r.removedNote)}</span>
              </span>
              <span className="min-w-0"><Dots notes={r.notes} lit={player.lit} id={id} /></span>
              <span className={`col-span-3 font-mono text-[13px] sm:col-span-1 ${clean ? "text-cream" : "text-muted"} order-last sm:order-none`}>
                {clean ? "no tritone" : `${r.tritones} tritone${r.tritones === 1 ? "" : "s"}`}
                {named && <span className="block text-muted">{named.name.replace(/^\S+\s/, "")}</span>}
              </span>
              <span className="flex items-center gap-2">
                <PlayButton on={on} label={`Play ${keyName} without ${r.removedDegree}`}
                            onClick={() => toggle(player, id, r.notes)} />
                <Link href={href} className="btn btn-ghost px-3 py-1.5 text-[13px]" aria-label={`Practise ${keyName} without ${r.removedDegree}`}>
                  Practise
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BeyondRow({ e, player }: { e: Entry; player: Player }) {
  const on = isOn(player, e.id);
  const s = e.scale;
  return (
    <li className="grid max-w-none gap-x-5 gap-y-2 p-4 sm:grid-cols-[auto_14rem_1fr] sm:items-start sm:p-5">
      <PlayButton on={on} label={`${on ? "Stop" : "Play"} ${e.name}`} onClick={() => toggle(player, e.id, s.notes)} big />
      <div>
        <h3 className="text-[18px] font-bold leading-tight">{e.name}</h3>
        <p className="mt-1 font-mono text-[13px] text-muted">
          {s.notes.length} notes · <span className="font-serif text-[15px] italic normal-case text-cream/70">{e.character}</span>
        </p>
        <div className="mt-2"><Dots notes={s.notes} lit={player.lit} id={e.id} /></div>
      </div>
      <p className="quiet">{e.colour}</p>
    </li>
  );
}
