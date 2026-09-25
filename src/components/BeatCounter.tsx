"use client";

/**
 * The beat, made obvious. One dot per beat of the bar; the dot sounding now is
 * gold (gold means "sounding now" and nothing else), the downbeat dot carries a
 * ring so the one is findable at a glance, and the bar count sits beside it.
 *
 * Always rendered, even when stopped, so nothing shifts when Play is pressed.
 * Reads a position straight from the audio clock, so it cannot drift from what
 * you hear.
 */

export interface BeatInfo {
  bar: number;
  bars: number;
  beat: number;
  beats: number;
  pending?: boolean;
  next?: "beat" | "bar" | null;
}

export default function BeatCounter({
  at, beats, bars, countdown = 0, barLabel = "bar", size = "md", className = "",
}: {
  /** null when stopped or counting in */
  at: BeatInfo | null;
  /** shape to show while stopped */
  beats: number;
  bars: number;
  countdown?: number;
  barLabel?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const n = Math.max(1, at?.beats ?? beats);
  const total = Math.max(1, at?.bars ?? bars);
  const dot = size === "lg" ? "h-4 w-4" : "h-3 w-3";
  const num = size === "lg" ? "text-2xl" : "text-[17px]";
  const counting = !at && countdown > 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] uppercase tracking-[0.08em] text-muted ${className}`}
      aria-label={at ? `${barLabel} ${at.bar} of ${total}, beat ${at.beat} of ${n}` : undefined}
    >
      <span className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => {
          const on = !!at && at.beat === i + 1;
          const one = i === 0;
          return (
            <i key={i}
               className={`inline-block rounded-full transition-colors duration-75 ${dot} ${
                 on ? "bg-gold" : at ? "bg-cream/20" : "bg-line"} ${
                 one ? "ring-1 ring-cream/60 ring-offset-2 ring-offset-surface" : ""}`} />
          );
        })}
      </span>

      {counting ? (
        <span>count in <span className={`num ${num} text-gold`}>{countdown}</span></span>
      ) : (
        <>
          <span>
            {barLabel} <span className={`num ${num} ${at ? "text-cream" : "text-muted"}`}>{at ? at.bar : "–"}</span>
            <span> / {total}</span>
          </span>
          <span>
            beat <span className={`num ${num} ${at ? "text-cream" : "text-muted"}`}>{at ? at.beat : "–"}</span>
            <span> / {n}</span>
          </span>
        </>
      )}

      {at?.pending && at.next === "bar" && (
        <span className="text-cream/70">new setting from the next {barLabel}</span>
      )}
    </div>
  );
}
