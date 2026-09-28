"use client";

/**
 * The ring with its symmetry switch: the chromatic clock, or the circle of
 * fifths with the four augmented triangles that make the twelve-point star
 * (board page 5). The triangles inside the scale are drawn strong and named
 * underneath: augmented G has two, whole tone has two, most scales none.
 */

import { ReactNode } from "react";
import ScaleRing, { RingLayout, TRIANGLE_INK } from "@/components/ScaleRing";
import { Seg } from "@/components/Panels";
import { Note } from "@/lib/theory/note";
import { augTriangles } from "@/lib/theory/board";

export default function SymmetryRing({
  notes, removed, activePc = null, size = 240, layout, onLayout, marks = null, splash = false,
  children, className = "", ringClassName = "",
}: {
  notes: Note[];
  removed: Note | null;
  activePc?: number | null;
  size?: number;
  layout: RingLayout;
  onLayout: (l: RingLayout) => void;
  marks?: { a: number[]; b: number[] } | null;
  splash?: boolean;
  children?: ReactNode;
  className?: string;
  ringClassName?: string;
}) {
  const inside = augTriangles(notes).filter((t) => t.inScale);
  const fifths = layout === "fifths";
  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <ScaleRing notes={notes} removed={removed} activePc={activePc} size={size}
                 layout={layout} augStar marks={marks} splash={splash} className={ringClassName}>
        {children}
      </ScaleRing>
      <Seg small value={layout} ariaLabel="Ring layout" onChange={onLayout}
           options={[{ label: "Clock", value: "chromatic" as const }, { label: "Fifths", value: "fifths" as const }]} />
      {/* one line, always the same height, so switching never moves the page */}
      <p className="micro min-h-[1.6em] max-w-[34ch] text-center leading-snug" aria-live="polite">
        {!fifths ? "One semitone per step. Switch to fifths to see the star."
          : inside.length ? (
            <>
              {inside.map((t, i) => (
                <span key={t.index}>
                  {i > 0 && <span className="text-muted"> and </span>}
                  <span className="font-semibold" style={{ color: TRIANGLE_INK[t.index] }}>{t.name}</span>
                </span>
              ))}
              <span className="text-muted">: {inside.length === 1 ? "an augmented triad" : "two augmented triads"} inside</span>
            </>
          ) : <span className="text-muted">One fifth per step. No augmented triad fits inside this scale.</span>}
      </p>
    </div>
  );
}
