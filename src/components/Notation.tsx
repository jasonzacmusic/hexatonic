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
import {
  Note, vexKey, ALT_NAME, keySignatureAlterations, notePretty,
} from "@/lib/theory/note";
import { meterById, pulseDuration, beamGroups } from "@/lib/theory/meters";

export interface NotationProps {
  notes: Note[];
  subdivision: number;      // 2 = 8ths, 3 = triplets, 4 = 16ths, 6 = sextuplets
  grouping: number;         // accent every N
  beatsPerBar?: number;
  meterId?: string;
  maxBars?: number;
  keySignature?: string | null;
  activeIndex?: number;
  compact?: boolean;
}

export default function Notation({
  notes, subdivision, grouping, beatsPerBar = 4, meterId = "4-4",
  maxBars = 35, keySignature = null, activeIndex = -1, compact = false,
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
        const meter = meterById(meterId);
        const perBar = subdivision * meter.top;
        const totalBars = Math.ceil(notes.length / perBar);
        const showBars = Math.min(totalBars, maxBars);
        setTruncated(totalBars > maxBars ? totalBars : 0);

        const barsPerSystem = compact ? (subdivision <= 3 ? 2 : 1)
          : subdivision <= 2 ? 4 : subdivision === 3 ? 3 : 2;
        const maxBarsInSystem = Math.min(barsPerSystem, showBars);
        const barW = compact ? 260
          : subdivision <= 2 ? 200 : subdivision === 3 ? 320 : subdivision === 4 ? 430 : 560;
        const pd = pulseDuration(meter, subdivision);
        const dur = pd.duration;
        const isTuplet = pd.tuplet !== null;
        const systems = Math.ceil(showBars / barsPerSystem);
        const width = maxBarsInSystem * barW + 80;
        const sysH = 142;
        const probe = new VF.Stave(12, 18 + Math.max(0, systems - 1) * sysH, barW + 46);
        // A stave's y is the top of its box. Size from the actual bottom staff
        // line instead of assuming that y is the first staff line.
        const height = Math.ceil(probe.getYForLine(4) + 68);

        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(width, height);
        const ctx = renderer.getContext();
        ctx.setFillStyle("#E8E0D2");
        ctx.setStrokeStyle("#E8E0D2");
        ctx.setFont("Academico", 10);
        setNaturalWidth(width);
        const signatureAlts = keySignature
          ? keySignatureAlterations(keySignature)
          : { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };

        let idx = 0;
        for (let sy = 0; sy < systems; sy++) {
          const barsHere = Math.min(barsPerSystem, showBars - sy * barsPerSystem);
          if (barsHere <= 0) break;
          const stave = new VF.Stave(12, 18 + sy * sysH, barsHere * barW + 46);
          stave.addClef("treble");
          if (keySignature) stave.addKeySignature(keySignature);
          if (sy === 0) stave.addTimeSignature(`${beatsPerBar}/4`);
          stave.setContext(ctx).draw();

          const tickables: any[] = [];
          const beams: any[] = [];
          const tuplets: any[] = [];

          for (let b = 0; b < barsHere; b++) {
            const barNotes: any[] = [];
            // Accidentals reset at each bar and otherwise carry within the bar.
            const accidentalState = new Map<string, number>();
            for (let k = 0; k < perBar; k++) {
              const n = notes[idx];
              if (!n) break;
              const sn = new VF.StaveNote({ keys: [vexKey(n)], duration: dur, auto_stem: true });
              const accidentalKey = `${n.letter}${n.octave}`;
              const previous = accidentalState.get(accidentalKey)
                ?? signatureAlts[n.letter];
              if (n.alt !== previous) {
                const accidental = n.alt === 0 ? "n" : ALT_NAME[String(n.alt)];
                sn.addModifier(new VF.Accidental(accidental), 0);
                accidentalState.set(accidentalKey, n.alt);
              }
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
              groups: beamGroups(meter).map((g) => new VF.Fraction(g.num, g.den)),
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

          const voice = new VF.Voice({ num_beats: meter.top * barsHere, beat_value: meter.bottom })
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
  }, [notes, subdivision, grouping, beatsPerBar, maxBars, keySignature, compact]);

  // Highlight without re-rendering the score.
  useEffect(() => {
    const gs = groupsRef.current;
    for (const g of gs) { g.style.fill = ""; g.style.stroke = ""; }
    const g = gs[activeIndex];
    if (g) { g.style.fill = "#F3D765"; g.style.stroke = "#F3D765"; }
  }, [activeIndex]);

  const totalBars = Math.ceil(notes.length / Math.max(1, subdivision * beatsPerBar));
  const opening = notes.slice(0, 16).map(notePretty).join(", ");

  return (
    <div
      role="img"
      aria-label={`Staff notation for a ${notes.length}-note drill across ${totalBars} ${
        totalBars === 1 ? "bar" : "bars"
      }, with accents every ${grouping} notes. Opening notes: ${opening}.`}
    >
      <div
        className="vf-host overflow-x-auto rounded-xl border border-line bg-[#171512] p-3"
        style={{ maxWidth: naturalWidth ? naturalWidth * 1.15 : undefined }}
        aria-hidden="true"
      >
        <div ref={hostRef} />
      </div>
      {truncated > 0 && (
        <p className="mt-2 font-mono text-[12px] text-amber">
          Showing the first {Math.min(truncated, maxBars)} of {truncated} bars — playback runs all of it.
        </p>
      )}
      {error && <p className="mt-2 font-mono text-[12px] text-amber">Notation: {error}</p>}
    </div>
  );
}
