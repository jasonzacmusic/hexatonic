"use client";

/**
 * FOR THE PRICE OF ONE. A symmetrical scale started on another of its own
 * notes gives back the same notes: G, B and E♭ augmented are one set of six.
 *
 *   <PriceOfOneView familyId="aug" keyName="G" onFamily={…} />   the full view (Sounds)
 *   <LearnOnePanel familyId="aug" keyName="G" onKey={…} />        the Practice panel
 *
 * The ring keeps the set's first note at 12 o'clock (ScaleRing's anchorPc),
 * so tapping another starting note turns the shape round the clock and it
 * lands on itself; only the green home dot has moved.
 *
 * Everything shown is computed by src/lib/theory/priceOfOne.ts and locked by
 * tests/price-of-one.test.ts in all twelve keys.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ScaleRing from "@/components/ScaleRing";
import { PlayGlyph, litIndex, upToOctave, usePreviewRun } from "@/components/ScalePreview";
import { useStageNav } from "@/components/StageFit";
import { midi, notePretty, pc } from "@/lib/theory/note";
import { buildScale, prettyDegree } from "@/lib/theory/scales";
import { previewAudio } from "@/lib/audio/engine";
import {
  PRICE_FAMILIES, PRICE_NOUN, PRICE_SHORT, PriceFamilyId, chordsLine, isPriceFamily, keyPc,
  learnRoute, practiceHref, prettyKeyName, priceFamily, priceHref, routeLine, sameNotesLine,
  setOfKey, sharedTriads, startName, startScales, whyLine,
} from "@/lib/theory/priceOfOne";

/** One colour per set. None is gold (sounding), red (removed), the root
 *  green or the second-triad violet. */
export const SET_INK = ["#E0894F", "#62B0E0", "#D97BC0", "#D9BF8C", "#B5C45A", "#9AA3B5"] as const;

type Player = ReturnType<typeof usePreviewRun>;
const SPREAD = 0.22;
const ALL_SPREAD = 0.17;

/* ── the full view ────────────────────────────────────────────────────── */

export function PriceOfOneView({
  familyId, keyName, onFamily, onKey, stage = false, player: given,
}: {
  familyId: PriceFamilyId;
  keyName: string;
  onFamily: (id: PriceFamilyId) => void;
  /** change the page key (the grid's keys and the route's leads call it) */
  onKey?: (k: string) => void;
  stage?: boolean;
  player?: Player;
}) {
  const own = usePreviewRun();
  const player = given ?? own;
  const fam = useMemo(() => priceFamily(familyId, keyName), [familyId, keyName]);
  const [active, setActive] = useState(keyName);
  useEffect(() => { setActive(keyName); }, [keyName, familyId]);
  const set = setOfKey(fam, active);
  const starts = useMemo(() => startScales(fam, set), [fam, set]);

  /* what is sounding: one start, or the whole walk round the set */
  const allId = `po-${familyId}-${set.lead}-all`;
  const idOf = (k: string) => `po-${familyId}-${k}`;
  const n = starts[0].scale.notes.length;
  const walking = player.lit?.id === allId || player.pending === allId;
  const walkAt = player.lit?.id === allId ? Math.min(starts.length - 1, Math.floor(player.lit.step / (n + 1))) : null;
  const shownKey = walkAt !== null ? starts[walkAt].key : active;
  const shown = starts.find((s) => s.key === shownKey) ?? starts[0];
  const litStep = walkAt !== null ? player.lit!.step % (n + 1) : litIndex(player.lit, idOf(shown.key), n + 1);
  const litNote = litStep === null ? null : litStep % n;
  const activePc = litNote === null ? null : pc(shown.scale.notes[litNote]);

  const playStart = (k: string) => {
    const s = startScales(fam, setOfKey(fam, k)).find((x) => x.key === k);
    if (!s) return;
    setActive(k);
    const id = idOf(k);
    if (player.lit?.id === id || player.pending === id) { player.stop(); return; }
    void player.play(id, upToOctave(s.scale.notes.map(midi)), SPREAD);
  };
  const playAll = () => {
    if (walking) { player.stop(); return; }
    void player.play(allId, starts.flatMap((s) => upToOctave(s.scale.notes.map(midi))), ALL_SPREAD);
  };

  /* stage mode: the arrow keys turn to the next starting note */
  const at = starts.findIndex((s) => s.key === active);
  useStageNav(stage, () => playStart(starts[(at - 1 + starts.length) % starts.length].key),
    () => playStart(starts[(at + 1) % starts.length].key));

  const chords = useMemo(() => sharedTriads(shown.scale.notes), [shown]);
  const soundingShown = player.lit?.id === idOf(shown.key) || player.pending === idOf(shown.key);

  return (
    <div className={stage ? "space-y-5" : "space-y-4"}>
      <FamilySwitch value={familyId} onChange={onFamily} />

      <div className={`grid gap-4 ${stage ? "lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8" : "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"}`}>
        {/* ── the family card: learn 1, get N ───────────────────────── */}
        <article className={`card flex flex-col p-4 sm:p-6 ${walking || soundingShown ? "border-gold/60" : ""}`}>
          <h3 className={`display leading-[1.02] ${stage ? "text-[56px]" : "text-[36px] sm:text-[44px]"}`}>
            Learn 1, get {fam.perSet}
          </h3>
          <p className={`mt-2 text-cream/85 ${stage ? "text-[21px]" : "text-[16px]"}`}>{sameNotesLine(fam, set)}</p>
          <p className={`font-serif italic text-cream/70 ${stage ? "text-[22px]" : "text-[18px]"}`}>{whyLine(fam)}</p>

          <div className={`mt-4 flex flex-col items-center gap-4 ${stage ? "" : "sm:flex-row sm:items-center sm:gap-6"} lg:flex-col lg:gap-5`}>
            <ScaleRing notes={shown.scale.notes} removed={null} size={stage ? 440 : 340}
                       anchorPc={keyPc(set.lead)} activePc={activePc}
                       className={stage ? "!w-[440px]" : "!w-[260px] sm:!w-[280px] lg:!w-[340px]"}>
              <span className="pointer-events-auto">
                <RoundPlay on={soundingShown} onClick={() => playStart(shown.key)}
                           label={`${soundingShown ? "Stop" : "Play"} ${prettyKeyName(shown.name)} ${PRICE_NOUN[familyId]}`} />
              </span>
            </ScaleRing>

            <div className={`min-w-0 flex-1 self-stretch lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-10`}>
              <div>
              <p className="micro-caps">Start on</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Starting note">
                {starts.map((s) => {
                  const sel = s.key === shown.key;
                  return (
                    <button key={s.key} type="button" onClick={() => playStart(s.key)} aria-pressed={sel}
                            className={`min-w-[3rem] rounded-lg border px-3 font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                              stage ? "py-2 text-[24px]" : "py-1.5 text-[18px]"} ${
                              sel ? "border-cream bg-cream text-[#17130a]" : "border-line-control/70 bg-surface2 text-cream hover:border-cream/60"}`}>
                      {prettyKeyName(s.name)}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={playAll} aria-pressed={walking}
                      className={`btn mt-2.5 px-3.5 py-2 text-[14px] ${walking ? "btn-primary" : "btn-ghost"}`}>
                <PlayGlyph playing={walking} size={11} />
                <span className="ml-2">{walking ? "Stop" : `Play all ${starts.length}`}</span>
              </button>

              </div>
              <div>
              <p className={`font-semibold text-cream ${stage ? "text-[22px]" : "mt-4 text-[16px] lg:mt-0"}`}>
                {prettyKeyName(shown.name)} {PRICE_NOUN[familyId]}
              </p>
              <span className="mt-1 flex flex-wrap gap-1">
                {shown.scale.notes.map((x, i) => (
                  <span key={i} className={`note-dot ${stage ? "!text-[20px]" : "text-[14px]"} ${litNote === i ? "is-lit" : ""}`}>{notePretty(x)}</span>
                ))}
              </span>
              <p className={`mt-1 font-mono tracking-[0.02em] text-muted ${stage ? "text-[17px]" : "text-[13px]"}`}>
                {shown.scale.degrees.map(prettyDegree).join("  ")}
              </p>
              <Link href={practiceHref(familyId, shown.key)} className="stage-hide btn btn-ghost mt-3 px-3.5 py-2 text-[14px]">
                Practise this →
              </Link>
              </div>
            </div>
          </div>

        </article>

        {/* ── the twelve keys, and the route ────────────────────────── */}
        <div className="space-y-4">
          <KeyGrid fam={fam} activeKey={shown.key}
                   onPick={playStart}
                   stage={stage} />
          <Route fam={fam} onKey={onKey} stage={stage} />
          <SharedChords line={chordsLine(fam, set, chords)} chords={chords} stage={stage} />
        </div>
      </div>
    </div>
  );
}

function RoundPlay({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={on}
            className={`grid h-11 w-11 place-items-center rounded-full border transition-[background-color,border-color,transform] duration-150 active:scale-95 ${
              on ? "border-gold bg-gold text-[#17130a]" : "border-line-control/70 bg-surface2 text-cream hover:border-cream/60"}`}>
      <PlayGlyph playing={on} size={14} />
    </button>
  );
}

/** The seven symmetrical families. Selected is cream; gold means sounding. */
export function FamilySwitch({ value, onChange }: { value: PriceFamilyId; onChange: (id: PriceFamilyId) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Symmetrical scale">
      {PRICE_FAMILIES.map((id) => {
        const sel = id === value;
        return (
          <button key={id} type="button" aria-pressed={sel} onClick={() => onChange(id)}
                  className={`rounded-lg border px-3 py-1.5 text-[15px] transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                    sel ? "border-cream bg-cream font-semibold text-[#17130a] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.5)]"
                        : "border-line-control/70 bg-surface2 text-cream/80 hover:text-cream"}`}>
            {PRICE_SHORT[id]}
          </button>
        );
      })}
    </div>
  );
}

/** The twelve keys, one column per set: each column is one set of notes. */
function KeyGrid({ fam, activeKey, onPick, stage }: {
  fam: ReturnType<typeof priceFamily>; activeKey: string; onPick: (k: string) => void; stage: boolean;
}) {
  const activeSet = setOfKey(fam, activeKey).index;
  return (
    <section className="card p-4 sm:p-5" aria-label="The twelve keys, grouped by their notes">
      <h3 className={`font-extrabold leading-tight tracking-[-0.015em] ${stage ? "text-[26px]" : "text-[21px]"}`}>
        12 keys, {fam.sets.length} sets of notes
      </h3>
      <p className={`mt-1 text-cream/75 ${stage ? "text-[18px]" : "text-[15px]"}`}>
        Each column is one set: every key in it plays the same {fam.size} notes.
      </p>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${fam.sets.length}, minmax(0, 1fr))` }}>
        {fam.sets.map((s) => {
          const ink = SET_INK[s.index % SET_INK.length];
          const on = s.index === activeSet;
          return (
            <div key={s.lead} className={`flex min-w-0 flex-col gap-1.5 rounded-xl p-1.5 ${on ? "bg-white/[0.05]" : ""}`}>
              <span aria-hidden className="mx-auto h-1.5 w-8 rounded-full" style={{ background: ink }} />
              {s.keys.map((k, i) => {
                const sel = k === activeKey;
                const label = prettyKeyName(s.names[i]);
                return (
                  <button key={k} type="button" onClick={() => onPick(k)} aria-pressed={sel}
                          aria-label={`${label}: set ${s.index + 1}`}
                          className={`rounded-lg border font-bold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                            stage ? "py-2 text-[22px]" : "py-1.5 text-[17px]"} ${
                            sel ? "border-cream bg-cream text-[#17130a]" : "text-cream hover:brightness-125"}`}
                          style={sel ? undefined : { borderColor: `${ink}99`, background: `${ink}1F` }}>
                    {label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** "Learn these 4 and you know all 12": one lead per set, straight into Practice. */
function Route({ fam, onKey, stage }: {
  fam: ReturnType<typeof priceFamily>; onKey?: (k: string) => void; stage: boolean;
}) {
  return (
    <section className="card p-4 sm:p-5" aria-label="Practice route">
      <h3 className={`font-extrabold leading-tight tracking-[-0.015em] ${stage ? "text-[26px]" : "text-[21px]"}`}>
        {routeLine(fam)}
      </h3>
      <ol className="mt-3 space-y-1.5">
        {fam.sets.map((s) => {
          const ink = SET_INK[s.index % SET_INK.length];
          const also = s.names.slice(1).map(prettyKeyName);
          return (
            <li key={s.lead} className="flex max-w-none flex-wrap items-center gap-x-3 gap-y-1">
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: ink }} />
              <span className={`w-9 shrink-0 font-bold sm:w-[4.5rem] ${stage ? "text-[22px]" : "text-[17px]"}`}>
                {onKey
                  ? <button type="button" onClick={() => onKey(s.lead)} className="underline decoration-transparent underline-offset-4 hover:decoration-cream/50">{prettyKeyName(s.lead)}</button>
                  : prettyKeyName(s.lead)}
              </span>
              <span className={`min-w-0 flex-1 text-muted ${stage ? "text-[17px]" : "text-[14px]"}`}>
                also gives you {also.join(", ")}
              </span>
              <Link href={practiceHref(fam.familyId, s.lead)} className="stage-hide btn btn-ghost px-3 py-1.5 text-[13px]"
                    aria-label={`Practise ${prettyKeyName(s.lead)} ${PRICE_NOUN[fam.familyId]}`}>
                Practise
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The chords the set holds: the same from every starting note. Tap to hear. */
function SharedChords({ line, chords, stage }: {
  line: string; chords: ReturnType<typeof sharedTriads>; stage: boolean;
}) {
  return (
    <section className="card p-4 sm:p-5" aria-label="The chords they share">
      <h3 className={`font-extrabold leading-tight tracking-[-0.015em] ${stage ? "text-[26px]" : "text-[21px]"}`}>
        The chords they share
      </h3>
      <p className={`mt-1 text-cream/80 ${stage ? "text-[18px]" : "text-[15px]"}`}>{line}</p>
      {chords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chords.map((c) => (
            <button key={c.symbol + c.notes} type="button" title="Tap to hear it"
                    onClick={() => { void previewAudio(c.voicing.map(midi)); }}
                    className={`rounded-lg border border-line bg-surface2 text-left text-cream transition-colors hover:border-[#4A4240] ${stage ? "px-2.5 py-1.5" : "px-2.5 py-1"}`}>
              <span className={`block font-bold ${stage ? "text-[19px]" : "text-[16px]"}`}>{c.symbol}</span>
              <span className={`block font-mono text-muted ${stage ? "text-[15px]" : "text-[13px]"}`}>{c.notes}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── the Practice panel ───────────────────────────────────────────────── */

/**
 * "Learn 1, get 3", beside the drill whenever a symmetrical scale is chosen.
 * Tapping a starting note changes the Practice key: same notes, new home. The
 * ring keeps the first key's clock, so it turns and lands on itself.
 */
export function LearnOnePanel({ familyId, keyName, onKey }: {
  familyId: string; keyName: string; onKey: (k: string) => void;
}) {
  const valid = isPriceFamily(familyId);
  /* The clock stays on the key you arrived with while you move inside its
     set, so the shape turns (and the chips keep their order); a key from
     another set starts a new clock. */
  const here0 = useMemo(() => (valid ? priceFamily(familyId as PriceFamilyId, keyName) : null), [valid, familyId, keyName]);
  const anchor = useRef<{ fam: string; key: string } | null>(null);
  if (here0 && (!anchor.current || anchor.current.fam !== familyId ||
      !setOfKey(here0, keyName).keys.includes(anchor.current.key)))
    anchor.current = { fam: familyId, key: keyName };
  const clock = anchor.current?.key ?? keyName;
  const fam = useMemo(() => (valid ? priceFamily(familyId as PriceFamilyId, clock) : null), [valid, familyId, clock]);
  if (!fam) return null;
  /* the chips sit on the scale Practice is playing, and are spelled as it
     spells them (C♯ in G whole tone), unless that is an awkward tonic */
  const here = buildScale(keyName, familyId, 0);
  const set0 = setOfKey(fam, keyName);
  const set = { ...set0, names: set0.keys.map((k) => startName(here.notes, k, familyId)) };
  const route = learnRoute(fam);
  return (
    <section className="stage-hide card !p-3 sm:!p-4" aria-label="Learn one, get more">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <ScaleRing notes={here.notes} removed={null} size={176} anchorPc={keyPc(clock)}
                   className="!w-[150px] sm:!w-[176px]" />
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="display text-[26px] leading-none sm:text-[30px]">Learn 1, get {fam.perSet}</h2>
          <p className="mt-1.5 text-[15px] text-cream/80">{sameNotesLine(fam, set)} {whyLine(fam)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Same notes, another home">
            <span className="micro-caps mr-1">Same notes from</span>
            {set.keys.map((k, i) => {
              const sel = k === keyName;
              return (
                <button key={k} type="button" onClick={() => onKey(k)} aria-pressed={sel}
                        className={`min-w-[2.6rem] rounded-lg border px-2.5 py-1 text-[16px] font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                          sel ? "border-cream bg-cream text-[#17130a]" : "border-line-control/70 bg-surface2 text-cream hover:border-cream/60"}`}>
                  {prettyKeyName(set.names[i])}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[14px] text-cream/75">
            {routeLine(fam)}{" "}
            {route.map((k, i) => (
              <span key={k}>
                {i > 0 && <span className="text-muted"> · </span>}
                <button type="button" onClick={() => onKey(k)}
                        className="font-semibold text-cream underline decoration-cream/30 underline-offset-4 hover:decoration-cream">
                  {prettyKeyName(k)}
                </button>
              </span>
            ))}
          </p>
          <Link href={priceHref(familyId, keyName)} className="link-gold mt-2 inline-block">See all 12 keys, grouped →</Link>
        </div>
      </div>
    </section>
  );
}
