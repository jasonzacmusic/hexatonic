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
import { Note, notePretty } from "@/lib/theory/note";
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
  const inside = augTriangles(notes).filter((t) => t.inScale).sort((a, b) => a.order - b.order);
  const fifths = layout === "fifths";
  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <ScaleRing notes={notes} removed={removed} activePc={activePc} size={size}
                 layout={layout} augStar marks={marks} splash={splash} className={ringClassName}>
        {children}
      </ScaleRing>
      <Seg small value={layout} ariaLabel="Ring layout" onChange={onLayout}
           options={[{ label: "Clock", value: "chromatic" as const }, { label: "Fifths", value: "fifths" as const }]} />
      {/* a fixed height, so switching never moves the page */}
      <div className="micro min-h-[4.4em] max-w-[36ch] text-center leading-snug" aria-live="polite">
        {!fifths ? <p className="text-muted">One semitone per step. Switch to fifths to see the star.</p>
          : inside.length ? (
            <>
              <p className="text-muted">Augmented triads inside this scale:</p>
              {inside.map((t) => (
                <p key={t.index}>
                  <span className="font-semibold" style={{ color: TRIANGLE_INK[t.index] }}>
                    {notePretty(t.notes[0])}+ = {t.name}
                  </span>
                  {t.written.length > 0 && (
                    <span className="text-muted">
                      {" "}({t.written.map((w) => `${notePretty(w.chord)} written ${notePretty(w.scale)}`).join(", ")})
                    </span>
                  )}
                </p>
              ))}
            </>
          ) : <p className="text-muted">One fifth per step. No augmented triad fits inside this scale.</p>}
      </div>
    </div>
  );
}
