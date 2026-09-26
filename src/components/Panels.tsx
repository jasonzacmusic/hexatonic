"use client";

import { Note, midi, notePretty, pc } from "@/lib/theory/note";
import { ScaleInstance } from "@/lib/theory/scales";
import { ChordSet, findChords, tertianOnly, susQuartal } from "@/lib/theory/chords";
import { Resolution, Gati } from "@/lib/theory/resolution";
import { previewAudio } from "@/lib/audio/engine";
import { useMemo, useState } from "react";

/* ── the resolution banner ────────────────────────────────────────────────
   Always visible, always live. If a combination would take 21 bars it says so
   before play is pressed. This element is what makes the app feel like it knows
   something.                                                                */

/** "Groups of 5 · khanda": plain words first, the Carnatic name second. These
 *  are accent groupings (phrases), not gati: gati is pulses per beat. */
export function groupingLabel(n: number, gati: Gati | null = null): { plain: string; trad: string | null } {
  return { plain: `Groups of ${n}`, trad: gati?.name ? gati.name.toLowerCase() : null };
}

export function ResolutionBanner({
  resolution, gati, seconds, bpm, big = false, playing = false, hint,
}: {
  resolution: Resolution; gati: Gati | null; seconds: number; bpm: number;
  big?: boolean; playing?: boolean;
  /** a computed suggestion, e.g. how many bars the same drill takes in triplets */
  hint?: string | null;
}) {
  const bars = resolution.bars;
  const grouping = resolution.groups ? resolution.totalNotes / resolution.groups : null;
  const label = grouping ? groupingLabel(grouping, gati) : null;
  const verdict =
    bars <= 4 ? "A short cycle: the one comes round quickly."
    : bars <= 8 ? "A longer cycle. Count the bars as you go."
    : "A long cycle.";

  return (
    <div className={`card relative overflow-hidden ${big ? "py-7" : "py-4"} ${playing ? "hx-pulse" : ""}`}>
      <div className="relative flex flex-wrap items-center gap-x-10 gap-y-5">
        <Stat v={bars} l={bars === 1 ? "bar to land on the one" : "bars to land on the one"} big={big} lead />
        <Stat v={resolution.totalNotes} l="notes" big={big} />
        <Stat v={resolution.reps} l={resolution.reps === 1 ? "time through the pattern" : "times through the pattern"} big={big} />
        <Stat v={`${seconds.toFixed(0)}s`} l={`at ${bpm} bpm`} big={big} />
        <div className={`max-w-sm ${big ? "text-lg" : "text-[15px]"}`}>
          {label && (
            <p className="font-semibold text-cream">
              {label.plain}
              {label.trad && <span className="font-normal text-muted"> · {label.trad}</span>}
            </p>
          )}
          {gati?.konnakol && <p className="font-mono text-[13px] text-muted">{gati.konnakol}</p>}
          <p className="mt-1 text-[15px] leading-relaxed text-cream/75">
            {verdict}{hint ? ` ${hint}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  v, l, big, lead,
}: { v: string | number; l: string; big?: boolean; lead?: boolean }) {
  return (
    <div className="flex flex-col">
      <span
        className={`num leading-none text-cream ${big ? (lead ? "text-6xl" : "text-4xl") : lead ? "text-4xl" : "text-3xl"}`}
      >
        {v}
      </span>
      <span className="mt-2 font-mono text-[13px] uppercase tracking-[0.06em] text-muted">{l}</span>
    </div>
  );
}

/* ── scale chips, with the ghost ─────────────────────────────────────────── */

export function ScaleChips({
  scale, activePc = null, transpose = 1, size = "md",
}: { scale: ScaleInstance; activePc?: number | null; transpose?: number; size?: "sm" | "md" | "lg" }) {
  if (scale.error) return <p className="text-sm text-red-hi">{scale.error}</p>;
  const lg = size === "lg";
  /* sm: a phone row of seven that fits 342px. The removed chip drops its
     "removed" caption (the strike and the red dashes say it, and the screen
     reader still hears it). */
  const sm = size === "sm";

  /* The removed note is shown IN ITS OWN PLACE in the row, not appended at the
     end. Seeing "C D E ⌀ G A B" reads instantly as a gap in the scale; seeing
     "C D E G A B ⌀" reads as an afterthought. The whole app is about a note that
     is missing from somewhere specific — so it has to sit somewhere specific. */
  const rootPc = scale.notes.length ? pc(scale.notes[0]) : 0;
  const rel = (n: Note) => (((pc(n) - rootPc) % 12) + 12) % 12;
  const row: { note: Note; removed: boolean; degree?: string }[] = [
    ...scale.notes.map((n, i) => ({ note: n, removed: false, degree: scale.degrees[i] })),
    ...(scale.removed ? [{ note: scale.removed, removed: true }] : []),
  ].sort((a, b) => rel(a.note) - rel(b.note));

  return (
    <div className={`flex flex-wrap items-stretch ${sm ? "gap-1" : "gap-2.5"}`}>
      {row.map((item, i) => {
        if (item.removed) {
          return (
            <div key={`x${i}`}
                 title={`${notePretty(item.note)} — removed from this scale`}
                 className={`relative flex flex-col items-center justify-center rounded-xl
                             border-2 border-dashed border-red/70 bg-red/[0.07]
                             ${lg ? "min-w-[74px] px-5 py-3" : sm ? "min-w-[40px] px-1.5 py-1.5" : "min-w-[58px] px-3.5 py-2"}`}>
              <span className={`font-semibold text-red-hi/85 ${lg ? "text-3xl" : "text-lg"}`}>
                {notePretty(item.note)}
              </span>
              {/* a clean strike, drawn rather than a text-decoration so it reads
                  as a deletion mark instead of a hyperlink style */}
              <span aria-hidden className={`pointer-events-none absolute top-1/2 h-[2px] -rotate-12 rounded bg-red-hi/80
                                            ${sm ? "inset-x-1.5 -translate-y-[1px]" : "inset-x-2.5 -translate-y-[3px]"}`} />
              {sm ? <span className="sr-only">removed</span> : (
                <span className="mt-0.5 font-mono text-[13px] uppercase tracking-[0.08em] text-red-hi/80">
                  removed
                </span>
              )}
            </div>
          );
        }
        const lit = activePc !== null && pc(item.note) === activePc;
        return (
          <button
            key={i}
            onClick={() => void previewAudio([midi(item.note) + 12 * transpose])}
            className={`chip ${lit ? "chip-lit" : ""} ${lg ? "min-w-[64px] px-4 py-2.5 sm:min-w-[74px] sm:px-5 sm:py-3" : sm ? "min-w-[40px] !px-1.5 !py-1" : "min-w-[58px]"}`}
            /* Exactly one lit note: the lit state arrives instantly and leaves
               in 60ms, so two chips are never half-lit at once. */
            style={{ transition: lit ? "none"
              : "background 60ms ease-out, border-color 60ms ease-out, color 60ms ease-out, box-shadow 60ms ease-out" }}
          >
            <span className={`block font-semibold ${lg ? "text-2xl sm:text-3xl" : "text-lg"}`}>
              {notePretty(item.note)}
            </span>
            <span className={`block font-mono text-[13px] ${lit ? "text-[#2A2208]" : "text-muted"}`}>
              {item.degree?.replace(/b/g, "♭").replace(/#/g, "♯")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── available harmony ────────────────────────────────────────────────────
   A chord is a pitch-class SET with a LIST of names. Tapping flips the reading,
   and that interaction is the teaching.                                     */

export function ChordGrid({ scale }: { scale: ScaleInstance }) {
  const chords = useMemo(() => (scale.error ? [] : findChords(scale.notes, [3, 4])), [scale]);
  if (!chords.length) return null;
  const groups: [string, ChordSet[]][] = [
    ["Triads", tertianOnly(chords.filter((c) => c.size === 3))],
    ["Sixths & sevenths", tertianOnly(chords.filter((c) => c.size === 4))],
    ["Sus & quartal", susQuartal(chords)],
  ];
  return (
    <div className="space-y-6">
      {groups.map(([label, list]) =>
        list.length ? (
          <div key={label}>
            <h3 className="mb-3 font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
              {label} <span className="text-cream">{list.length}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {list.map((c, i) => <ChordCard key={i} chord={c} />)}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function ChordCard({ chord }: { chord: ChordSet }) {
  const [i, setI] = useState(0);
  const name = chord.names[i % chord.names.length];
  const multi = chord.names.length > 1;
  return (
    <button
      onClick={() => {
        void previewAudio(name.voicing.map(midi));
        if (multi) setI((v) => v + 1);
      }}
      className="group rounded-xl border border-line bg-surface2 px-4 py-2.5 text-left transition hover:border-gold/60 hover:bg-white/[0.03]"
      title={multi ? "tap to hear it, and again to flip the reading" : "tap to hear it"}
    >
      <span className="block text-[15px] font-semibold">{name.symbol}</span>
      <span className="block font-mono text-[13px] text-muted">
        {name.notes.join(" ")}
        {multi && <span className="ml-1 text-cream/70 opacity-0 transition group-hover:opacity-100">⇄</span>}
      </span>
    </button>
  );
}

/* ── small controls ──────────────────────────────────────────────────────── */

export function Seg<T extends string | number>({
  value, options, onChange, ariaLabel, small = false,
}: {
  value: T; options: { label: string; value: T }[]; onChange: (v: T) => void; ariaLabel?: string;
  /** a slimmer bar (34px) for secondary switches such as Triads / Sevenths */
  small?: boolean;
}) {
  return (
    <div className={`seg ${small ? "!p-0.5" : ""}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" data-on={o.value === value}
                className={`data-[on=true]:![background:#F4EFE4] data-[on=true]:!text-[#0A0908] ${small ? "!px-2.5 !py-1" : ""}`}
                aria-pressed={o.value === value}
                onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  on, onClick, children, title, disabled, className = "",
}: {
  on: boolean; onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean;
  className?: string;
}) {
  return (
    <button type="button" data-on={on} onClick={onClick}
            className={`btn btn-ghost data-[on=true]:!border-cream/70 data-[on=true]:!bg-cream/[0.08] data-[on=true]:!text-cream ${className}`}
            aria-pressed={on} title={title} disabled={disabled}>
      {children}
    </button>
  );
}
