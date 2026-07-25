"use client";

import { midi, notePretty, pc } from "@/lib/theory/note";
import { ScaleInstance } from "@/lib/theory/scales";
import { ChordSet, findChords, tertianOnly, susQuartal } from "@/lib/theory/chords";
import { Resolution, Gati } from "@/lib/theory/resolution";
import { getAudio } from "@/lib/audio/engine";
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
  scale, activePc = null, size = "md",
}: { scale: ScaleInstance; activePc?: number | null; size?: "md" | "lg" }) {
  if (scale.error) return <p className="text-sm text-amber">{scale.error}</p>;
  const lg = size === "lg";
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {scale.notes.map((n, i) => {
        const lit = activePc !== null && pc(n) === activePc;
        return (
          <button
            key={i}
            onClick={() => { void getAudio().preview([midi(n)]).catch(() => undefined); }}
            className={`chip ${lit ? "chip-lit" : ""} ${lg ? "min-w-[74px] px-5 py-3" : "min-w-[58px]"}`}
          >
            <span className={`block font-semibold ${lg ? "text-3xl" : "text-lg"}`}>
              {notePretty(n)}
            </span>
            <span className={`block font-mono text-[9px] ${lit ? "text-[#5a4a12]" : "text-muted"}`}>
              {scale.degrees[i]}
            </span>
          </button>
        );
      })}
      {scale.removed && (
        <div className={`chip chip-ghost ${lg ? "min-w-[74px] px-5 py-3" : "min-w-[58px]"}`}
             title="the note we removed">
          <span className={`block font-semibold line-through decoration-2 ${lg ? "text-3xl" : "text-lg"}`}>
            {notePretty(scale.removed)}
          </span>
          <span className="block font-mono text-[9px] opacity-80">removed</span>
        </div>
      )}
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
        void getAudio().preview(name.voicing.map(midi)).catch(() => undefined);
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
