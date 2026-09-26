"use client";

import { useEffect, useRef } from "react";
import { levelCount, type GameId, type GameInfo } from "@/lib/ear/games";
import type { AllProgress } from "@/lib/ear/progress";

export default function GamePicker({
  games, current, scores, onPick,
}: {
  games: GameInfo[];
  current: GameId;
  scores: AllProgress;
  onPick: (id: GameId) => void;
}) {
  const row = useRef<HTMLElement>(null);
  /* keep the chosen card in view on the phone row (a deep link, or a swipe) */
  useEffect(() => {
    const nav = row.current;
    const card = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !card || nav.scrollWidth <= nav.clientWidth) return;
    /* Measured on screen, not by offsetLeft: the row is not the cards'
       offset parent, so offsetLeft pointed at the wrong card. */
    const shift = card.getBoundingClientRect().left - nav.getBoundingClientRect().left - 20;
    nav.scrollLeft += shift;
  }, [current]);
  return (
    /* On a phone the five cards are one swipeable row, so the game itself stays
       near the top of the screen; from sm up they are a grid. */
    <nav ref={row} aria-label="Ear games"
      className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
      {games.map((g, i) => {
        const on = g.id === current;
        const s = scores[g.id];
        return (
          <button key={g.id} type="button" aria-pressed={on} onClick={() => onPick(g.id)}
            className={`group relative flex w-[72%] shrink-0 snap-start flex-col rounded-2xl border px-4 py-3.5 text-left transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.985] sm:w-auto ${
              on ? "border-cream/70 bg-surface2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                 : "border-line bg-surface hover:border-line-control"}`}>
            <span className="flex items-center justify-between gap-2 font-mono text-[13px] text-muted">
              <span>{String(i + 1).padStart(2, "0")}</span>
              {/* one pip per level: filled once it is open */}
              <span className="flex items-center gap-2" aria-label={`Level ${s.unlocked} of ${levelCount(g.id)} open${s.total ? `, ${s.right} of ${s.total} right` : ""}`}>
                {s.total > 0 && <span className="tabular-nums">{s.right}/{s.total}</span>}
                <span className="flex gap-[3px]" aria-hidden>
                  {Array.from({ length: levelCount(g.id) }, (_, k) => (
                    <span key={k} className={`h-1.5 w-3 rounded-full ${k < s.unlocked ? "bg-cream/85" : "bg-line-control/50"}`} />
                  ))}
                </span>
              </span>
            </span>
            <span className={`mt-1.5 text-[17px] font-bold leading-snug ${on ? "text-cream" : "text-cream/90"}`}>
              {g.title}
            </span>
            <span className="mt-1 text-[15px] leading-snug text-cream/75">{g.line}</span>
          </button>
        );
      })}
    </nav>
  );
}
