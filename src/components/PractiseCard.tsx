"use client";

/**
 * "How to practise this mode": three or four lines, every one computed by
 * src/lib/modeCoach.ts from the library (never typed per page):
 *   the colour notes, the triad pair that plays it, the drone, the note to
 *   leave out (red), and the links that drill it.
 * The two chords wear the pair colours (blue, then violet), as on Harmony.
 * The card folds away; it opens folded out. Its links are plain page loads,
 * because each page reads its link once, on arrival.
 */

import { useMemo } from "react";
import { practiseCard } from "@/lib/modeCoach";
import { notePretty } from "@/lib/theory/note";
import { PAIR_INK } from "@/components/ScaleRing";

export default function PractiseCard({
  keyName, family, mode, className = "", inset = false,
}: {
  keyName: string; family: string; mode: number; className?: string;
  /** Inside another card: a well, never a second card. */
  inset?: boolean;
}) {
  const c = useMemo(() => practiseCard(keyName, family, mode), [keyName, family, mode]);
  if (c.scale.error || !c.scale.notes.length) return null;
  const [A, B] = c.pair?.pair.shapes ?? [];
  const link = "font-semibold text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream";
  const lbl = "font-mono text-[13px] uppercase tracking-[0.08em] text-muted";
  return (
    <details open className={`${inset ? "well" : "card"} group !p-3 sm:!p-4 ${className}`} data-testid="practise-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[15px] font-semibold text-cream">
        <span className="inline-block text-muted transition-transform group-open:rotate-90" aria-hidden>▸</span>
        How to practise {c.title}
      </summary>
      <dl className="mt-2.5 grid gap-x-3 gap-y-1.5 text-[15px] leading-snug text-cream/85 sm:grid-cols-[88px_minmax(0,1fr)]">
        <dt className={`${lbl} sm:pt-0.5`}>Colour</dt>
        <dd>
          {c.colour.length ? (
            <>
              {c.colour.map((x, i) => (
                <span key={i}>{i > 0 && (i === c.colour.length - 1 ? " and " : ", ")}
                  <b className="text-cream">{notePretty(x.note)}</b> <span className="font-mono text-[13px] text-muted">({x.degree})</span>
                </span>
              ))}{" "}
              {c.colour.length === 1 ? "makes" : "make"} the mood. Lean on {c.colour.length === 1 ? "it" : "them"}.
            </>
          ) : "Your own notes: listen for the ones that surprise you."}
        </dd>

        <dt className={`${lbl} sm:pt-0.5`}>Pair</dt>
        <dd>
          {c.pair && A && B ? (
            <>
              <b style={{ color: PAIR_INK.a }}>{A.symbol}</b>
              <span className="px-1 text-muted">+</span>
              <b style={{ color: PAIR_INK.b }}>{B.symbol}</b>{" "}
              {c.pair.leavesOut
                ? <>play six of its seven notes (no {notePretty(c.pair.leavesOut)}).</>
                : <>play all six notes.</>}{" "}
              <a href={c.pair.href} className={link}>Pair ladder →</a>
            </>
          ) : <span className="text-cream/75">{c.pairWhy}</span>}
        </dd>

        <dt className={`${lbl} sm:pt-0.5`}>Drone</dt>
        <dd>
          {c.droneLine}{" "}
          {c.avoid.length > 0 && (
            <>
              Leave out{" "}
              {c.avoid.map((x, i) => (
                <span key={i}>{i > 0 && " and "}
                  <b className="text-red-hi">{notePretty(x.note)}</b> <span className="font-mono text-[13px] text-red/90">(no {x.degree})</span>
                </span>
              ))}.
            </>
          )}
        </dd>
      </dl>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-[15px]">
        <a href={c.practiceHref} className={link}>Drill it in thirds →</a>
        {c.ear ? <a href={c.ear.href} className={link}>{c.ear.label} →</a>
          : <span className="text-cream/60">Not in the ear games yet</span>}
      </div>
    </details>
  );
}
