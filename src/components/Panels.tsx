"use client";

import { Note, notePretty, midi, pc } from "@/lib/theory/note";
import { ScaleInstance } from "@/lib/theory/scales";
import { ChordSet, findChords, tertianOnly, susQuartal } from "@/lib/theory/chords";
import { Resolution, Gati } from "@/lib/theory/resolution";
import { getAudio } from "@/lib/audio/engine";
import { useMemo, useState } from "react";

/* ── the resolution banner ────────────────────────────────────────────────
   Always visible, always live. If a combination would take 21 bars, it says so
   in amber BEFORE play is pressed. This single element is what makes the app
   feel like it knows something.                                             */

export function ResolutionBanner({
  resolution, gati, seconds, bpm, warnLong = true, big = false,
}: {
  resolution: Resolution; gati: Gati | null; seconds: number; bpm: number;
  warnLong?: boolean; big?: boolean;
}) {
  const bars = resolution.bars;
  const tone = !warnLong ? "gold" : bars <= 4 ? "gold" : bars <= 8 ? "amber" : "red";
  const border = tone === "gold" ? "border-l-gold" : tone === "amber" ? "border-l-amber" : "border-l-red";
  const num = tone === "gold" ? "text-gold" : tone === "amber" ? "text-amber" : "text-red";
  const verdict = bars <= 4 ? "Short and camera-friendly."
    : bars <= 8 ? "Usable, but long for a live take."
    : "Too long for camera. Try a triplet subdivision for odd groupings.";

  const Stat = ({ v, l }: { v: string | number; l: string }) => (
    <div className="flex flex-col">
      <b className={`${num} tabular-nums ${big ? "text-5xl" : "text-2xl"} font-extrabold leading-none`}>{v}</b>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{l}</span>
    </div>
  );

  return (
    <div className={`flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-line ${border} border-l-4 bg-surface px-5 py-4`}>
      <Stat v={bars} l="bars to resolve" />
      <Stat v={resolution.totalNotes} l="notes" />
      <Stat v={resolution.reps} l="pattern reps" />
      <Stat v={`${seconds.toFixed(0)}s`} l={`at ${bpm} bpm`} />
      <div className={`${big ? "text-lg" : "text-sm"} max-w-md`}>
        {gati?.name ? (
          <div className="font-semibold">
            {gati.name} gati <span className="text-muted">· {gati.konnakol}</span>
          </div>
        ) : (
          <div className="font-semibold">Groups of {resolution.groups ? resolution.totalNotes / resolution.groups : "—"}
            <span className="text-muted"> · {gati?.konnakol}</span></div>
        )}
        {warnLong && <div className="text-muted">{verdict}</div>}
      </div>
    </div>
  );
}

/* ── scale chips, with the ghost ─────────────────────────────────────────── */

export function ScaleChips({
  scale, activePc = null, onNote, transpose = 1,
}: { scale: ScaleInstance; activePc?: number | null; onNote?: (m: number) => void; transpose?: number }) {
  if (scale.error) return <p className="text-sm text-red">{scale.error}</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {scale.notes.map((n, i) => {
        const lit = activePc !== null && pc(n) === activePc;
        return (
          <button
            key={i}
            onClick={() => { const m = midi(n) + 12 * transpose; onNote ? onNote(m) : getAudio().preview([m]); }}
            className={`chip min-w-[52px] font-semibold transition ${
              lit ? "border-gold bg-gold text-[#17130a]" : "hover:border-gold"
            }`}
          >
            <span className="block text-base">{notePretty(n)}</span>
            <span className={`block font-mono text-[9px] ${lit ? "text-[#5a4a12]" : "text-muted"}`}>
              {scale.degrees[i]}
            </span>
          </button>
        );
      })}
      {scale.removed && (
        <div className="chip min-w-[52px] border-red bg-transparent" title="the note we removed">
          <span className="block text-base font-semibold text-red line-through decoration-2">
            {notePretty(scale.removed)}
          </span>
          <span className="block font-mono text-[9px] text-red/80">removed</span>
        </div>
      )}
    </div>
  );
}

/* ── available harmony ────────────────────────────────────────────────────
   A chord is a pitch-class SET with a LIST of names. Tapping flips the reading —
   that interaction IS the teaching.                                          */

export function ChordGrid({ scale, transpose = 1 }: { scale: ScaleInstance; transpose?: number }) {
  const chords = useMemo(
    () => (scale.error ? [] : findChords(scale.notes, [3, 4])),
    [scale]
  );
  if (!chords.length) return null;
  const groups: [string, ChordSet[]][] = [
    ["Triads", tertianOnly(chords.filter((c) => c.size === 3))],
    ["Sixths & sevenths", tertianOnly(chords.filter((c) => c.size === 4))],
    ["Sus & quartal", susQuartal(chords)],
  ];
  return (
    <div className="space-y-5">
      {groups.map(([label, list]) =>
        list.length ? (
          <div key={label}>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {label} — {list.length}
            </h3>
            <div className="flex flex-wrap gap-2">
              {list.map((c, i) => <ChordCard key={i} chord={c} transpose={transpose} />)}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function ChordCard({ chord, transpose }: { chord: ChordSet; transpose: number }) {
  const [i, setI] = useState(0);
  const name = chord.names[i % chord.names.length];
  const multi = chord.names.length > 1;
  return (
    <button
      onClick={() => {
        getAudio().preview(chord.notes.map((n) => midi(n) + 12 * transpose));
        if (multi) setI((v) => v + 1);
      }}
      className="rounded-lg border border-line bg-surface2 px-3 py-2 text-left transition hover:border-gold"
      title={multi ? "tap to hear it, and again to flip the reading" : "tap to hear it"}
    >
      <span className="block text-sm font-semibold">{name.symbol}</span>
      <span className="block font-mono text-[10px] text-muted">
        {name.notes.join(" ")}{multi ? " · tap to flip" : ""}
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
        <button key={String(o.value)} data-on={o.value === value} onClick={() => onChange(o.value)}
                type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  on, onClick, children, title,
}: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" className="btn btn-ghost" data-on={on} onClick={onClick} title={title}>
      {children}
    </button>
  );
}
