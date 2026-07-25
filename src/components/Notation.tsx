"use client";

/**
 * VexFlow engraving. The full house checklist, and the three GRADUS traps.
 *
 *  1. NEVER hand-build beams — Beam.generateBeams owns grouping, per beat.
 *  2. Nothing crosses a barline.
 *  3. A stave's y is the top of its BOX, not its top line — ask getYForLine().
 *  4. VexFlow sizes its root SVG with an inline absolute-pixel style; beaten in
 *     globals.css with `width:100% !important`.
 *  5. width:100% blows up SHORT scores — cap the FRAME at natural width.
 *  6. Highlight without re-render: g.vf-stavenote groups appear in document
 *     order matching tickable creation order. BarNote emits no such group, so
 *     the mapping stays aligned.
 */

import { useEffect, useRef, useState } from "react";
import { Note, vexKey, ALT_NAME } from "@/lib/theory/note";

export interface NotationProps {
  notes: Note[];
  subdivision: number;      // 2 = 8ths, 3 = triplets, 4 = 16ths, 6 = sextuplets
  grouping: number;         // accent every N
  beatsPerBar?: number;
  maxBars?: number;
  activeIndex?: number;
  compact?: boolean;
}

export default function Notation({
  notes, subdivision, grouping, beatsPerBar = 4,
  maxBars = 24, activeIndex = -1, compact = false,
}: NotationProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const groupsRef = useRef<SVGGElement[]>([]);
  const [truncated, setTruncated] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || !notes.length) return;

    (async () => {
      // Nothing renders before the music fonts resolve.
      try {
        if (document.fonts?.load) {
          await Promise.all([
            document.fonts.load('30pt "Bravura"'),
            document.fonts.load('30pt "Academico"'),
          ]);
        }
      } catch { /* fonts are bundled in vexflow-bravura; carry on */ }

      const VF = (await import("vexflow")).Flow;
      if (cancelled || !hostRef.current) return;
      const el = hostRef.current;
      el.innerHTML = "";
      groupsRef.current = [];

      try {
        const perBar = subdivision * beatsPerBar;
        const totalBars = Math.ceil(notes.length / perBar);
        const showBars = Math.min(totalBars, maxBars);
        setTruncated(totalBars > maxBars ? totalBars : 0);

        const barsPerSystem = compact ? (subdivision <= 3 ? 2 : 1)
          : subdivision <= 2 ? 4 : subdivision === 3 ? 3 : 2;
        const barW = compact ? 260
          : subdivision <= 2 ? 200 : subdivision === 3 ? 320 : subdivision === 4 ? 430 : 560;
        const dur = subdivision === 2 ? "8" : subdivision === 3 ? "8"
          : subdivision === 4 ? "16" : "16";
        const isTuplet = subdivision === 3 || subdivision === 6;
        const systems = Math.ceil(showBars / barsPerSystem);
        const width = barsPerSystem * barW + 80;
        const sysH = 128;

        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(width, systems * sysH + 40);
        const ctx = renderer.getContext();
        ctx.setFont("Academico", 10);
        setNaturalWidth(width);

        let idx = 0;
        for (let sy = 0; sy < systems; sy++) {
          const barsHere = Math.min(barsPerSystem, showBars - sy * barsPerSystem);
          if (barsHere <= 0) break;
          const stave = new VF.Stave(12, 18 + sy * sysH, barsHere * barW + 46);
          if (sy === 0) stave.addClef("treble").addTimeSignature(`${beatsPerBar}/4`);
          stave.setContext(ctx).draw();

          const tickables: any[] = [];
          const beams: any[] = [];
          const tuplets: any[] = [];

          for (let b = 0; b < barsHere; b++) {
            const barNotes: any[] = [];
            for (let k = 0; k < perBar; k++) {
              const n = notes[idx];
              if (!n) break;
              const sn = new VF.StaveNote({ keys: [vexKey(n)], duration: dur, auto_stem: true });
              if (n.alt !== 0) sn.addModifier(new VF.Accidental(ALT_NAME[String(n.alt)]), 0);
              if (idx % grouping === 0)
                sn.addModifier(
                  new VF.Articulation("a>").setPosition(VF.Modifier.Position.ABOVE), 0
                );
              barNotes.push(sn);
              idx++;
            }
            if (!barNotes.length) break;
            // generateBeams owns grouping, strips flags, and unifies stems.
            beams.push(...VF.Beam.generateBeams(barNotes, {
              groups: [new VF.Fraction(1, 4)],
              maintain_stem_directions: false,
            }));
            if (isTuplet) {
              for (let g = 0; g + subdivision <= barNotes.length; g += subdivision)
                tuplets.push(new VF.Tuplet(barNotes.slice(g, g + subdivision), {
                  num_notes: subdivision,
                  notes_occupied: subdivision === 3 ? 2 : 4,
                  bracketed: false,
                }));
            }
            tickables.push(...barNotes);
            if (b < barsHere - 1) tickables.push(new VF.BarNote());
          }

          const voice = new VF.Voice({ num_beats: beatsPerBar * barsHere, beat_value: 4 })
            .setStrict(false);
          voice.addTickables(tickables);
          new VF.Formatter().joinVoices([voice]).format([voice], barsHere * barW + 10);
          voice.draw(ctx, stave);
          beams.forEach((bm) => bm.setContext(ctx).draw());
          tuplets.forEach((t) => t.setContext(ctx).draw());
        }

        groupsRef.current = Array.from(
          el.querySelectorAll<SVGGElement>("svg g.vf-stavenote")
        );
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "notation failed");
      }
    })();

    return () => { cancelled = true; };
  }, [notes, subdivision, grouping, beatsPerBar, maxBars, compact]);

  // Highlight without re-rendering the score.
  useEffect(() => {
    const gs = groupsRef.current;
    for (const g of gs) { g.style.fill = ""; g.style.stroke = ""; }
    const g = gs[activeIndex];
    if (g) { g.style.fill = "#9A6B08"; g.style.stroke = "#9A6B08"; }
  }, [activeIndex]);

  return (
    <div>
      <div
        className="vf-host overflow-x-auto rounded-xl bg-[#F7F4EC] p-3"
        style={{ maxWidth: naturalWidth ? naturalWidth * 1.15 : undefined }}
      >
        <div ref={hostRef} />
      </div>
      {truncated > 0 && (
        <p className="mt-2 font-mono text-[11px] text-amber">
          Showing the first {Math.min(truncated, 24)} of {truncated} bars — playback runs all of it.
        </p>
      )}
      {error && <p className="mt-2 font-mono text-[11px] text-red">Notation: {error}</p>}
    </div>
  );
}
