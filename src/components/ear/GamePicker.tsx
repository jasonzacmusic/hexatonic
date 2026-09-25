"use client";

import { useEffect, useRef } from "react";
import type { GameId, GameInfo } from "@/lib/ear/games";

export interface Tally { right: number; total: number; streak: number; best: number }

export default function GamePicker({
  games, current, scores, onPick,
}: {
  games: GameInfo[];
  current: GameId;
  scores: Partial<Record<GameId, Tally>>;
  onPick: (id: GameId) => void;
}) {
  const row = useRef<HTMLElement>(null);
  /* keep the chosen card in view on the phone row (a deep link, or a swipe) */
  useEffect(() => {
    const nav = row.current;
    const card = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !card || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = card.offsetLeft - nav.offsetLeft - 20;
  }, [current]);
  return (
    /* On a phone the five cards are one swipeable row, so the game itself stays
       near the top of the screen; from sm up they are a grid. */
    <nav ref={row} aria-label="Ear games"
      className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
      {games.map((g, i) => {
        const on = g.id === current;
        const s = scores[g.id];
        return (
          <button key={g.id} type="button" aria-pressed={on} onClick={() => onPick(g.id)}
            className={`group relative flex w-[72%] shrink-0 snap-start flex-col rounded-2xl border px-4 py-3.5 text-left transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.985] sm:w-auto ${
              on ? "border-cream/70 bg-surface2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                 : "border-line bg-surface hover:border-line-control"}`}>
            <span className="flex items-baseline justify-between gap-2 font-mono text-[13px] text-muted">
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s && s.total > 0 && <span className="tabular-nums">{s.right}/{s.total}</span>}
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
