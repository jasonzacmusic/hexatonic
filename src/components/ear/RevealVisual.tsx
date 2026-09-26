"use client";

/**
 * The reveal, drawn: a keyboard and the chromatic ring for whichever row is
 * sounding (your pick, then the answer). Gold is the key sounding now and
 * nothing else; red is only the missing note. Nothing lights during the
 * question itself, so the picture can never give the answer away.
 */

import { useEffect, useRef, useState } from "react";
import Keyboard from "@/components/Keyboard";
import ScaleRing from "@/components/ScaleRing";
import type { Row } from "@/lib/ear/games";
import type { Mark } from "@/lib/ear/program";

export default function RevealVisual({
  rows, lit, sounding, tonicMidi,
}: {
  rows: Row[];
  /** the lit mark, only while the reveal is playing */
  lit: Mark | null;
  sounding: number[];
  tonicMidi: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = rows.find((r) => r.id === lit?.row) ?? rows.find((r) => r.id === "answer") ?? rows[0];
  if (!shown?.scale) return null;
  const start = Math.floor(tonicMidi / 12) * 12;
  const active = lit ? sounding.filter((m) => m >= start && m < start + 24) : [];
  const ringOn = width >= 560;
  const ringSize = width >= 900 ? 184 : 156;
  const room = width - (ringOn ? ringSize + 40 : 0);
  const keyW = Math.max(18, Math.min(46, Math.floor(room / 14)));
  const which = shown.id === "pick" ? "Your pick" : "The answer";

  return (
    <div ref={box} className="rounded-2xl border border-line bg-bg/40 p-3 sm:p-4">
      <p className="mb-2 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/70" aria-live="off">
        {which}{lit ? <span className="text-gold"> · sounding</span> : null}
      </p>
      {width > 0 && (
        <div className="flex items-center justify-center gap-6 sm:gap-8">
          {ringOn && (
            <ScaleRing notes={shown.scale} removed={shown.removed ?? null}
                       activePc={active.length ? ((active[0] % 12) + 12) % 12 : null}
                       size={ringSize} showLabels={false} className="shrink-0" />
          )}
          <div className="min-w-0">
            <Keyboard scale={shown.scale} removed={shown.removed ?? null} activeMidi={active}
                      startMidi={start} octaves={2} keyWidth={keyW}
                      height={keyW >= 30 ? 118 : 92} showLabels={keyW >= 26} />
          </div>
        </div>
      )}
    </div>
  );
}
