"use client";

/**
 * Harmony → Two-triad pairs.
 *
 * Two ways in, both inside a real scale, nothing typed in by hand:
 *   · a seven-note scale (the modes, harmonic and melodic minor): the seven
 *     pairs of neighbouring triads, each leaving out one note;
 *   · a six-note scale from the app: every way two triads make exactly it.
 * The chosen pair runs in the movement lab below, which stays mounted while
 * you change pairs, so the music never stops for a selection.
 */

import { useMemo, useRef, useState } from "react";
import MovementLab from "@/components/MovementLab";
import { SHAPE_TONES } from "@/components/PairKeyboard";
import { Seg } from "@/components/Panels";
import { notePretty, pc } from "@/lib/theory/note";
import { FAMILY_GROUPS, KEYS } from "@/lib/theory/scales";
import {
  buildParent, ParentId, parentInKey, parentPairs, PARENTS, SixNoteScale, sixNoteScales, TwoChordPair,
} from "@/lib/theory/pairAtlas";

type Source = "parent" | "six";

const pretty = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯");

export default function PairAtlas({ onOpenSixth }: { onOpenSixth?: () => void }) {
  const [source, setSource] = useState<Source>("parent");
  const [key, setKey] = useState("G");
  const [parentId, setParentId] = useState<ParentId>("ionian");
  const [sixId, setSixId] = useState("diatonic-3");
  const [pick, setPick] = useState<string | null>(null);

  const ps = useMemo(() => buildParent(key, parentId), [key, parentId]);
  const fromParent = useMemo(() => parentPairs(ps), [ps]);
  const sixes = useMemo(() => sixNoteScales(key), [key]);
  const six = sixes.find((s) => s.id === sixId) ?? sixes[0];
  const list = source === "parent" ? fromParent : six.pairs;
  const chosen = list.find((p) => p.id === pick) ?? list[0] ?? null;

  /* A scale two triads cannot make leaves the lab on the last real pair, so
     nothing that is playing stops because of a click. */
  const last = useRef<{ pair: TwoChordPair; source: string } | null>(null);
  const sourceName = source === "parent" ? parentInKey(ps.tonic, ps.parent) : `${notePretty(six.tonic)} ${six.name}`;
  if (chosen) last.current = { pair: chosen, source: sourceName };
  const lab = last.current;

  const plain = list.filter((p) => p.plain);
  const colour = list.filter((p) => !p.plain);

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[60ch]">
            <p className="eyebrow">Two triads, no shared note</p>
            <p className="mt-2 text-[15px] leading-relaxed text-cream/80">
              Two triads that share no note make six notes: a hexatonic scale. Pick a scale and
              every such pair inside it is listed.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="field">
              <label>Start from</label>
              <Seg value={source} ariaLabel="Start from"
                   options={[{ label: "7-note scale", value: "parent" as const }, { label: "6-note scale", value: "six" as const }]}
                   onChange={(v) => { setSource(v); setPick(null); }} />
            </div>
            <div className="field">
              <label htmlFor="pa-key">Key</label>
              <select id="pa-key" className="sel !w-24" value={key} onChange={(e) => setKey(e.target.value)}>
                {KEYS.map((k) => <option key={k} value={k}>{pretty(k)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {source === "parent" ? (
          <ParentPicker ps={ps} parentId={parentId} chosen={chosen}
            onParent={(id) => { setParentId(id); setPick(null); }} />
        ) : (
          <SixPicker sixes={sixes} six={six} onSix={(id) => { setSixId(id); setPick(null); }} />
        )}

        {/* ── the pairs ─────────────────────────────────────────────────── */}
        {list.length > 0 ? (
          <div className="mt-5 space-y-4">
            {[{ title: "Two major or minor chords", items: plain },
              { title: "With a diminished or augmented chord", items: colour }]
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.title}>
                  <p className="micro-caps mb-2">{g.title}</p>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
                    {g.items.map((p) => (
                      <PairCard key={p.id} pair={p} on={chosen?.id === p.id} onPick={() => setPick(p.id)} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="well mt-5">
            <p className="text-[15px] text-cream/85">
              <span className="font-semibold text-cream">{six.name}</span> cannot be made from two triads:
              no major, minor, diminished or augmented pair covers its six notes.
              {six.susSplits.length > 0 && <> It splits only with a sus chord: <span className="font-semibold text-cream">{six.susSplits.join(", ")}</span>.</>}
            </p>
          </div>
        )}

        <p className="mt-5 border-t border-line pt-4 text-[15px] text-cream/75">
          Eight notes, two four-note chords with nothing shared, such as Barry Harris&rsquo;s
          sixth + diminished:{" "}
          {onOpenSixth ? (
            <button type="button" onClick={onOpenSixth} className="font-semibold text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">
              Sixth–diminished tab →
            </button>
          ) : (
            <a href="/harmony?tab=sixth" className="font-semibold text-cream underline decoration-cream/40 underline-offset-4">
              Sixth–diminished tab →
            </a>
          )}
        </p>
      </section>

      {lab && <MovementLab pair={lab.pair} source={lab.source} />}
    </div>
  );
}

/* ── pickers ─────────────────────────────────────────────────────────── */

function ParentPicker({ ps, parentId, chosen, onParent }: {
  ps: ReturnType<typeof buildParent>;
  parentId: ParentId;
  chosen: TwoChordPair | null;
  onParent: (id: ParentId) => void;
}) {
  const inPair = (sym: string) => chosen?.shapes.findIndex((s) => s.symbol === sym) ?? -1;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Parent scale">
        {PARENTS.map((p) => (
          <button key={p.id} type="button" aria-pressed={p.id === parentId} onClick={() => onParent(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-[15px] font-medium transition-colors duration-150 ${
              p.id === parentId ? "border-cream bg-cream text-bg" : "border-line-control bg-surface2 text-cream/80 hover:border-cream/50"}`}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[15px] text-cream/80">
        <span className="font-semibold text-cream">{parentInKey(ps.tonic, ps.parent)}</span>
        {ps.parent.mode && <span className="text-muted"> ({ps.parent.mode})</span>}
        {ps.respelled && <span className="text-muted"> · written from {notePretty(ps.tonic)}, fewer accidentals than {pretty(ps.asked)}</span>}
      </p>
      {/* the seven triads, so every numeral in the pairs can be checked by eye */}
      <ol className="mt-2 grid grid-cols-7 gap-1" aria-label="The triad on each degree">
        {ps.triads.map((t, i) => {
          const s = inPair(t.symbol);
          return (
            <li key={i} className="rounded-md bg-black/25 px-1 py-1.5 text-center"
                style={s >= 0 ? { boxShadow: `inset 0 -3px 0 ${SHAPE_TONES[s].ink}` } : undefined}>
              <span className="block font-mono text-[13px] text-muted">{t.roman}</span>
              <span className="block truncate text-[15px] font-bold text-cream">{t.symbol}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const GROUP_ORDER = ["remove", "pentatonic", "symmetric", "colour"] as const;

function SixPicker({ sixes, six, onSix }: {
  sixes: SixNoteScale[];
  six: SixNoteScale;
  onSix: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {GROUP_ORDER.map((g) => {
        const items = sixes.filter((s) => s.group === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            <p className="micro-caps mb-1.5">{FAMILY_GROUPS.find((x) => x.id === g)?.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((s) => {
                const on = s.id === six.id;
                return (
                  <button key={s.id} type="button" aria-pressed={on} onClick={() => onSix(s.id)}
                    className={`rounded-lg border px-3 py-1.5 text-left text-[15px] font-medium transition-colors duration-150 ${
                      on ? "border-cream bg-cream text-bg" : "border-line-control bg-surface2 text-cream/85 hover:border-cream/50"}`}>
                    {s.name}
                    <span className={`ml-2 font-mono text-[13px] ${on ? "text-bg/70" : "text-muted"}`}>
                      {s.pairs.length ? `${s.pairs.length} ${s.pairs.length === 1 ? "pair" : "pairs"}` : "none"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-[15px] text-cream/80">
        <span className="font-semibold text-cream">{notePretty(six.tonic)} {six.name}</span>
        <span className="ml-2 font-mono text-cream/75">{six.notes.map(notePretty).join(" ")}</span>
        {six.removed && <span className="ml-2 font-mono text-red">no {notePretty(six.removed)}</span>}
      </p>
    </div>
  );
}

function PairCard({ pair, on, onPick }: { pair: TwoChordPair; on: boolean; onPick: () => void }) {
  const [A, B] = pair.shapes;
  const shapeOf = (n: (typeof pair.notes)[number]) => (A.notes.some((x) => pc(x) === pc(n)) ? 0 : 1);
  return (
    <button type="button" onClick={onPick} aria-pressed={on}
      className={`rounded-xl border p-2.5 text-left transition-colors duration-150 sm:p-3 ${
        on ? "border-cream/80 bg-white/[0.06]" : "border-line bg-surface2 hover:border-cream/35"}`}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[18px] font-extrabold tracking-[-0.01em] sm:text-[19px]">
          <span style={{ color: SHAPE_TONES[0].ink }}>{A.symbol}</span>
          <span className="px-1 text-muted">+</span>
          <span style={{ color: SHAPE_TONES[1].ink }}>{B.symbol}</span>
        </span>
        {pair.roman && <span className="shrink-0 font-mono text-[13px] text-muted">{pair.roman}</span>}
      </span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono text-[13px] sm:text-[14px]">
        {pair.notes.map((n, i) => (
          <span key={i} style={{ color: SHAPE_TONES[shapeOf(n)].ink }}>{notePretty(n)}</span>
        ))}
        {pair.removed && <span className="ml-1 text-red">no {notePretty(pair.removed)}</span>}
      </span>
      <span className="mt-1 block text-[14px] leading-snug text-cream/80">
        {pair.name}
        {pair.rootless && <span className="text-muted"> · floats</span>}
        {!pair.stepwise && <span className="text-muted"> · voices cross</span>}
      </span>
    </button>
  );
}
