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

export function ResolutionBanner({
  resolution, gati, seconds, bpm, big = false, playing = false,
}: {
  resolution: Resolution; gati: Gati | null; seconds: number; bpm: number;
  big?: boolean; playing?: boolean;
}) {
  const bars = resolution.bars;
  const accent = bars <= 4 ? "#C9A227" : "#D08A2C";
  const verdict =
    bars <= 4 ? "Short and camera-friendly."
    : bars <= 8 ? "Usable, but long for a live take."
    : "Too long for camera. Try a triplet subdivision for odd groupings.";

  return (
    <div
      className={`card relative overflow-hidden ${big ? "py-7" : "py-5"} ${playing ? "hx-pulse" : ""}`}
      style={{ borderColor: `${accent}44` }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div
        className="pointer-events-none absolute -left-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full opacity-[0.13]"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
      />
      <div className="relative flex flex-wrap items-center gap-x-10 gap-y-5 pl-3">
        <Stat v={bars} l="bars to resolve" accent={accent} big={big} lead />
        <Stat v={resolution.totalNotes} l="notes" accent={accent} big={big} />
        <Stat v={resolution.reps} l="pattern reps" accent={accent} big={big} />
        <Stat v={`${seconds.toFixed(0)}s`} l={`at ${bpm} bpm`} accent={accent} big={big} />
        <div className={`max-w-sm ${big ? "text-base" : "text-sm"}`}>
          <p className="font-semibold">
            {gati?.name ? `${gati.name} gati` : `groups of ${resolution.totalNotes / (resolution.groups ?? 1)}`}
          </p>
          <p className="font-mono text-[12px] text-gold">{gati?.konnakol}</p>
          <p className="quiet mt-1">{verdict}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  v, l, accent, big, lead,
}: { v: string | number; l: string; accent: string; big?: boolean; lead?: boolean }) {
  return (
    <div className="flex flex-col">
      <span
        className={`num leading-none ${big ? (lead ? "text-6xl" : "text-4xl") : lead ? "text-4xl" : "text-3xl"}`}
        style={{ color: lead ? accent : "#F4EFE4" }}
      >
        {v}
      </span>
      <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{l}</span>
    </div>
  );
}

/* ── scale chips, with the ghost ─────────────────────────────────────────── */

export function ScaleChips({
  scale, activePc = null, transpose = 1, size = "md",
}: { scale: ScaleInstance; activePc?: number | null; transpose?: number; size?: "md" | "lg" }) {
  if (scale.error) return <p className="text-sm text-red-hi">{scale.error}</p>;
  const lg = size === "lg";

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
    <div className="flex flex-wrap items-stretch gap-2.5">
      {row.map((item, i) => {
        if (item.removed) {
          return (
            <div key={`x${i}`}
                 title={`${notePretty(item.note)} — removed from this scale`}
                 className={`relative flex flex-col items-center justify-center rounded-xl
                             border-2 border-dashed border-red/70 bg-red/[0.07]
                             ${lg ? "min-w-[74px] px-5 py-3" : "min-w-[58px] px-3.5 py-2"}`}>
              <span className={`font-semibold text-red-hi/85 ${lg ? "text-3xl" : "text-lg"}`}>
                {notePretty(item.note)}
              </span>
              {/* a clean strike, drawn rather than a text-decoration so it reads
                  as a deletion mark instead of a hyperlink style */}
              <span aria-hidden className="pointer-events-none absolute inset-x-2.5 top-1/2 h-[2px]
                                           -translate-y-[3px] -rotate-12 rounded bg-red-hi/80" />
              <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-red-hi/70">
                removed
              </span>
            </div>
          );
        }
        const lit = activePc !== null && pc(item.note) === activePc;
        return (
          <button
            key={i}
            onClick={() => void previewAudio([midi(item.note) + 12 * transpose])}
            className={`chip ${lit ? "chip-lit" : ""} ${lg ? "min-w-[74px] px-5 py-3" : "min-w-[58px]"}`}
          >
            <span className={`block font-semibold ${lg ? "text-3xl" : "text-lg"}`}>
              {notePretty(item.note)}
            </span>
            <span className={`block font-mono text-[9px] ${lit ? "text-[#5a4a12]" : "text-muted"}`}>
              {item.degree}
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
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {label} <span className="text-gold">{list.length}</span>
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
      <span className="block font-mono text-[10px] text-muted">
        {name.notes.join(" ")}
        {multi && <span className="ml-1 text-gold/70 opacity-0 transition group-hover:opacity-100">⇄</span>}
      </span>
    </button>
  );
}

/* ── small controls ──────────────────────────────────────────────────────── */

export function Seg<T extends string | number>({
  value, options, onChange, ariaLabel,
}: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void; ariaLabel?: string }) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" data-on={o.value === value}
                aria-pressed={o.value === value}
                onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  on, onClick, children, title, disabled,
}: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-ghost" data-on={on} onClick={onClick}
            aria-pressed={on} title={title} disabled={disabled}>
      {children}
    </button>
  );
}
