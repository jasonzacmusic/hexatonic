"use client";

/**
 * The levels of one game, and how close the next one is. Open levels are
 * buttons; a locked level is shown, disabled, with what it takes to open it.
 * The meter is cream, not gold: gold only ever means "sounding now".
 */

import type { LevelInfo } from "@/lib/ear/games";
import type { GameProgress } from "@/lib/ear/progress";
import { UNLOCK_STREAK } from "@/lib/ear/progress";

function Lock() {
  return (
    <svg aria-hidden width="11" height="13" viewBox="0 0 11 13" className="inline-block">
      <rect x="0.75" y="5.5" width="9.5" height="6.75" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 5.5V3.8a2.5 2.5 0 0 1 5 0v1.7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function LevelBar({
  levels, progress, level, onPick,
}: {
  levels: LevelInfo[];
  progress: GameProgress;
  /** the level chosen for the next round */
  level: number;
  onPick: (level: number) => void;
}) {
  const top = progress.unlocked >= levels.length;
  const info = levels[level - 1];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:gap-x-5">
      <div className="field">
        <label id="ear-level-label">Level</label>
        <div className="seg" role="group" aria-labelledby="ear-level-label">
          {levels.map((l, i) => {
            const n = i + 1;
            const open = n <= progress.unlocked;
            return (
              <button key={n} type="button" disabled={!open} data-on={n === level} aria-pressed={n === level}
                      aria-label={open ? `Level ${n}: ${l.name}` : `Level ${n}: ${l.name}, locked`}
                      title={open ? l.name : `Get ${UNLOCK_STREAK} right in a row on level ${n - 1} to open this`}
                      onClick={() => onPick(n)}
                      className="min-w-[48px] disabled:cursor-not-allowed disabled:opacity-60">
                {open ? n : <span className="inline-flex items-center gap-1.5">{n} <Lock /></span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-w-0 flex-1 basis-[140px] self-end pb-1 sm:basis-[240px] sm:self-auto sm:pb-0">
        <p className="text-[15px] font-bold leading-snug text-cream">{info.name}</p>
        <p className="text-[14px] leading-snug text-cream/75">{info.line}</p>
      </div>
      <div className="w-full sm:w-auto" aria-live="polite">
        {top ? (
          <p className="font-mono text-[13px] text-cream/75">All {levels.length} levels open</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: UNLOCK_STREAK }, (_, i) => (
                <span key={i} className={`h-2 w-5 rounded-full ${i < progress.toward ? "bg-cream" : "bg-line-control/45"}`} />
              ))}
            </span>
            <span className="font-mono text-[13px] text-cream/75">
              {progress.toward}/{UNLOCK_STREAK} in a row on level {progress.unlocked} opens {progress.unlocked + 1}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
