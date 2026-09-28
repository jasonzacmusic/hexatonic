"use client";

/**
 * Harmony → Two-triad pairs, on the board: the chosen pair written as Jason
 * writes it in class (triad A circled, triad B arrowed, intervals above) and
 * the same marks on the ring, which can turn to the circle of fifths.
 */

import { useState } from "react";
import BoardRow from "@/components/BoardRow";
import SymmetryRing from "@/components/SymmetryRing";
import { PAIR_INK, RingLayout } from "@/components/ScaleRing";
import { notePretty, pc } from "@/lib/theory/note";
import { boardStyle } from "@/lib/theory/board";
import type { TwoChordPair } from "@/lib/theory/pairAtlas";

const HOW: Record<string, string> = {
  degrees: "Above each note: its interval from the tonic.",
  steps: "Above: the step to the next note, named as it is written. Three semitones, then one, all the way up.",
  thirds: "The arcs: every other note is a major third away. That is why no fifth can form.",
};

export default function PairBoard({ pair }: { pair: TwoChordPair }) {
  const [layout, setLayout] = useState<RingLayout>("chromatic");
  const [A, B] = pair.shapes;
  const marks = { a: A.notes.map(pc), b: B.notes.map(pc) };
  const pick = boardStyle(pair.notes);

  return (
    <section className="card overflow-hidden" aria-labelledby="pair-board-title">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.5fr)_auto] lg:gap-10">
        <div className="min-w-0">
          <h2 id="pair-board-title" className="text-[26px] font-black leading-tight tracking-[-0.02em] sm:text-3xl">
            <span style={{ color: PAIR_INK.a }}>{A.symbol}</span>
            <span className="px-2 text-muted">+</span>
            <span style={{ color: PAIR_INK.b }}>{B.symbol}</span>
            <span className="ml-3 font-serif text-[22px] font-normal italic text-cream/70 sm:text-[24px]">on the board</span>
          </h2>
          <div className="mt-5">
            <BoardRow notes={pair.notes} removed={pair.removed} ovals={marks.a} arrows={marks.b} />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-cream/85">
            <li className="inline-flex items-center gap-2">
              <svg width="22" height="16" aria-hidden="true"><ellipse cx="11" cy="8" rx="9" ry="6.5" fill={PAIR_INK.a} fillOpacity={0.18} stroke={PAIR_INK.a} strokeWidth="1.5" /></svg>
              circled: <span className="font-semibold" style={{ color: PAIR_INK.a }}>{A.symbol}</span>
              <span className="font-mono text-[14px] text-cream/70">{A.notes.map(notePretty).join(" ")}</span>
            </li>
            <li className="inline-flex items-center gap-2">
              <svg width="14" height="18" aria-hidden="true"><g stroke={PAIR_INK.b} strokeWidth="1.8" strokeLinecap="round" fill="none"><line x1="7" y1="17" x2="7" y2="3" /><polyline points="2.5,7.5 7,2.5 11.5,7.5" /></g></svg>
              arrowed: <span className="font-semibold" style={{ color: PAIR_INK.b }}>{B.symbol}</span>
              <span className="font-mono text-[14px] text-cream/70">{B.notes.map(notePretty).join(" ")}</span>
            </li>
            {pair.removed && (
              <li className="inline-flex items-center gap-2">
                <svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" stroke="#E8666C" strokeWidth="1.5" strokeDasharray="3 2.5" /></svg>
                <span className="text-red">left out: {notePretty(pair.removed)}</span>
              </li>
            )}
          </ul>
          <p className="quiet mt-2">{HOW[pick]}</p>
        </div>
        <SymmetryRing notes={pair.notes} removed={pair.removed} layout={layout} onLayout={setLayout}
                      marks={marks} size={250} className="mx-auto" />
      </div>
    </section>
  );
}
