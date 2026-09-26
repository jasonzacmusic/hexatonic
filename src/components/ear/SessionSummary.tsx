"use client";

/**
 * After ten questions: the score, and the pair you mix up most with what to
 * listen for. The tip is computed (progress.ts), never written by hand.
 */

import type { Summary } from "@/lib/ear/progress";
import Musical from "./Musical";

export default function SessionSummary({
  summary, nextLevel, onNextLevel, onAgain,
}: {
  summary: Summary;
  /** a level that is open but not chosen, worth suggesting */
  nextLevel: { n: number; name: string } | null;
  onNextLevel: () => void;
  onAgain: () => void;
}) {
  const [first, ...rest] = summary.confusions;
  const pct = summary.total ? Math.round((summary.right / summary.total) * 100) : 0;
  return (
    <section aria-label="Session summary" className="hx-rise mt-6 rounded-2xl border border-cream/25 bg-surface2 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-cream/75">Session of {summary.total}</p>
        <p className="font-mono text-[13px] text-cream/75">{pct}%</p>
      </div>
      <p className="display mt-2 text-[34px] leading-none">
        {summary.right}<span className="text-cream/50">/{summary.total}</span>
      </p>
      {first ? (
        <div className="mt-4 space-y-2">
          <p className="text-[17px] font-bold leading-snug text-cream"><Musical text={first.line} /></p>
          <p className="font-serif text-[22px] italic leading-snug text-cream/90"><Musical text={first.tip} /></p>
          {rest.slice(0, 2).map((c) => (
            <p key={c.a + c.b} className="text-[15px] leading-snug text-cream/75"><Musical text={`${c.line} ${c.tip}`} /></p>
          ))}
        </div>
      ) : (
        <p className="mt-4 font-serif text-[22px] italic leading-snug text-cream/90">
          No mix-ups at all. {nextLevel ? `Level ${nextLevel.n} is open: try ${nextLevel.name}.` : "Try a quicker tempo next."}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary min-h-[48px] px-6 text-[15px]" onClick={onAgain}>
          New session <kbd className="hidden font-mono text-[13px] opacity-70 sm:inline">Enter</kbd>
        </button>
        {nextLevel && (
          <button type="button" className="btn btn-ghost min-h-[48px] px-5 text-[15px]" onClick={onNextLevel}>
            Go to level {nextLevel.n}: {nextLevel.name}
          </button>
        )}
      </div>
    </section>
  );
}
