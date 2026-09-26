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
 *
 * Following the music (the most important thing on the page while it plays):
 *   · a gold band sits behind the sounding note and a faint tint on its bar
 *   · notes already played in this pass dim, idle notes are cream #F4EFE4
 *   · exactly one note is gold at a time: it lights instantly, no fade
 *   · the frame scrolls to keep the sounding system in view
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The highlight must land in the same frame as the rest of the page, never one
// frame late; layout effects run before paint. (SSR-safe fallback.)
const useSyncEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
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
  /** cap the frame's height (px) and scroll inside it to follow the music */
  maxHeight?: number | string;
  /** let the staff grow to the full width of its container (big view) */
  fill?: boolean;
}

/* Staff lines, ledger lines and noteheads use the brand's brightest colour.
   Played notes dim; the sounding note turns gold. */
const INK = "#F4EFE4";
const LEDGER = { strokeStyle: "#F4EFE4", fillStyle: "#F4EFE4", lineWidth: 1.6 };
const GOLD = "#C9A227";

interface NoteBox { x: number; w: number; sys: number; bar: number }
interface SysBox { top: number; bottom: number }
interface BarBox { sys: number; x0: number; x1: number }

export default function Notation({
  notes, subdivision, grouping, beatsPerBar = 4, meterId = "4-4",
  maxBars = 35, keySignature = null, activeIndex = -1, compact = false, maxHeight, fill = false,
}: NotationProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const groupsRef = useRef<SVGGElement[]>([]);
  const boxesRef = useRef<{ notes: NoteBox[]; systems: SysBox[]; bars: BarBox[] }>({
    notes: [], systems: [], bars: [],
  });
  const bandRef = useRef<SVGRectElement | null>(null);
  const tintRef = useRef<SVGRectElement | null>(null);
  const litRef = useRef(-1);
  const sysRef = useRef(-1);
  const [truncated, setTruncated] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [drawn, setDrawn] = useState(0);

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
      bandRef.current = null;
      tintRef.current = null;
      litRef.current = -1;
      sysRef.current = -1;

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
        ctx.setFillStyle(INK);
        ctx.setStrokeStyle(INK);
        ctx.setFont("Academico", 10);
        setNaturalWidth(width);
        const signatureAlts = keySignature
          ? keySignatureAlterations(keySignature)
          : { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };

        const sysBoxes: SysBox[] = [];
        const noteMeta: { sys: number; bar: number }[] = [];
        let idx = 0;
        for (let sy = 0; sy < systems; sy++) {
          const barsHere = Math.min(barsPerSystem, showBars - sy * barsPerSystem);
          if (barsHere <= 0) break;
          const stave = new VF.Stave(12, 18 + sy * sysH, barsHere * barW + 46);
          stave.addClef("treble");
          if (keySignature) stave.addKeySignature(keySignature);
          if (sy === 0) stave.addTimeSignature(`${meter.top}/${meter.bottom}`);
          stave.setContext(ctx).draw();
          sysBoxes.push({ top: stave.getYForLine(0), bottom: stave.getYForLine(4) });

          const tickables: any[] = [];
          const beams: any[] = [];
          const tuplets: any[] = [];

          for (let b = 0; b < barsHere; b++) {
            const barNotes: any[] = [];
            const globalBar = sy * barsPerSystem + b;
            // Accidentals reset at each bar and otherwise carry within the bar.
            const accidentalState = new Map<string, number>();
            for (let k = 0; k < perBar; k++) {
              const n = notes[idx];
              if (!n) break;
              const sn = new VF.StaveNote({ keys: [vexKey(n)], duration: dur, auto_stem: true });
              sn.setLedgerLineStyle(LEDGER);
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
              noteMeta.push({ sys: sy, bar: globalBar });
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

        const groups = Array.from(el.querySelectorAll<SVGGElement>("svg g.vf-stavenote"));
        groupsRef.current = groups;

        /* Measure every note once, in SVG units, so the band and the tint can
           move without re-engraving. getBBox is in the SVG's own coordinates,
           which scale with the frame, so nothing drifts at any width. */
        const noteBoxes: NoteBox[] = groups.map((g, i) => {
          let x = 0, w = 0;
          try {
            const head = g.querySelector<SVGGraphicsElement>(".vf-notehead") ?? g;
            const bb = head.getBBox();
            x = bb.x; w = bb.width;
          } catch { /* jsdom has no layout; the band just stays hidden */ }
          const meta = noteMeta[i] ?? { sys: 0, bar: 0 };
          return { x, w, sys: meta.sys, bar: meta.bar };
        });
        const barBoxes: BarBox[] = [];
        noteBoxes.forEach((nb) => {
          const b = barBoxes[nb.bar];
          if (!b) barBoxes[nb.bar] = { sys: nb.sys, x0: nb.x, x1: nb.x + nb.w };
          else { b.x0 = Math.min(b.x0, nb.x); b.x1 = Math.max(b.x1, nb.x + nb.w); }
        });
        boxesRef.current = { notes: noteBoxes, systems: sysBoxes, bars: barBoxes };

        // The band and tint sit BEHIND the engraving: first children of the svg.
        const svg = el.querySelector("svg");
        if (svg) {
          const NS = "http://www.w3.org/2000/svg";
          const layer = document.createElementNS(NS, "g");
          layer.setAttribute("class", "hx-follow");
          const tint = document.createElementNS(NS, "rect");
          tint.setAttribute("fill", "#F4EFE4");
          tint.setAttribute("fill-opacity", "0.045");
          tint.setAttribute("rx", "8");
          tint.style.display = "none";
          const band = document.createElementNS(NS, "rect");
          band.setAttribute("fill", GOLD);
          band.setAttribute("fill-opacity", "0.26");
          band.setAttribute("rx", "6");
          band.style.display = "none";
          layer.append(tint, band);
          svg.insertBefore(layer, svg.firstChild);
          tintRef.current = tint;
          bandRef.current = band;
        }
        setError(null);
        setDrawn((v) => v + 1);
      } catch (e: any) {
        setError(e?.message ?? "notation failed");
      }
    })();

    return () => { cancelled = true; };
  }, [notes, subdivision, grouping, beatsPerBar, meterId, maxBars, keySignature, compact]);

  // Follow the music without re-rendering the score.
  useSyncEffect(() => {
    const gs = groupsRef.current;
    const { notes: nb, systems, bars } = boxesRef.current;
    const band = bandRef.current, tint = tintRef.current;
    const i = activeIndex;
    const prev = litRef.current;

    // One gold note, lit instantly. The previous one returns to ink at once.
    if (prev >= 0 && gs[prev]) { gs[prev].style.fill = ""; gs[prev].style.stroke = ""; }
    // Played notes in this pass dim; a new pass (or a stop) restores them all.
    if (i < 0 || i < prev) gs.forEach((g) => { g.style.opacity = ""; });
    for (let k = Math.max(0, prev < 0 || i < prev ? 0 : prev); k < i && k < gs.length; k++)
      gs[k].style.opacity = "0.42";

    const g = gs[i];
    if (!g || !nb[i]) {
      litRef.current = -1;
      sysRef.current = -1;
      if (band) band.style.display = "none";
      if (tint) tint.style.display = "none";
      return;
    }
    g.style.opacity = "";
    g.style.fill = GOLD;
    g.style.stroke = GOLD;
    litRef.current = i;

    const box = nb[i];
    const sys = systems[box.sys];
    if (band && sys && box.w > 0) {
      const padX = 5;
      band.setAttribute("x", String(box.x - padX));
      band.setAttribute("width", String(box.w + padX * 2));
      band.setAttribute("y", String(sys.top - 26));
      band.setAttribute("height", String(sys.bottom - sys.top + 52));
      band.style.display = "";
    }
    const bar = bars[box.bar];
    if (tint && sys && bar) {
      tint.setAttribute("x", String(bar.x0 - 14));
      tint.setAttribute("width", String(bar.x1 - bar.x0 + 28));
      tint.setAttribute("y", String(sys.top - 30));
      tint.setAttribute("height", String(sys.bottom - sys.top + 60));
      tint.style.display = "";
    }

    // Keep the sounding note in view inside the frame (never the page).
    const frame = frameRef.current;
    const svg = hostRef.current?.querySelector("svg");
    if (frame && svg && naturalWidth && sys) {
      const scale = svg.getBoundingClientRect().width / naturalWidth;
      const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (box.sys !== sysRef.current && frame.scrollHeight > frame.clientHeight + 2) {
        frame.scrollTo({ top: Math.max(0, (sys.top - 44) * scale), behavior: smooth ? "smooth" : "auto" });
      }
      sysRef.current = box.sys;
      if (frame.scrollWidth > frame.clientWidth + 2) {
        const x = box.x * scale;
        const { scrollLeft, clientWidth } = frame;
        if (x < scrollLeft + 24 || x > scrollLeft + clientWidth - 48)
          frame.scrollTo({ left: Math.max(0, x - clientWidth / 3), behavior: smooth ? "smooth" : "auto" });
      }
    }
  }, [activeIndex, drawn, naturalWidth]);

  const totalBars = Math.ceil(notes.length / Math.max(1, subdivision * meterById(meterId).top));
  const opening = notes.slice(0, 16).map(notePretty).join(", ");

  return (
    <div
      role="img"
      aria-label={`Staff notation for a ${notes.length}-note drill across ${totalBars} ${
        totalBars === 1 ? "bar" : "bars"
      }, with accents every ${grouping} notes. Opening notes: ${opening}.`}
    >
      <div
        ref={frameRef}
        className="vf-host overflow-auto overscroll-contain rounded-xl border border-line bg-[#171512] p-3"
        style={{
          maxWidth: fill ? undefined : naturalWidth ? naturalWidth * 1.15 : undefined,
          maxHeight: maxHeight ?? undefined,
        }}
        aria-hidden="true"
      >
        <div ref={hostRef} />
      </div>
      {truncated > 0 && (
        <p className="mt-2 font-mono text-[13px] text-amber">
          Showing the first {Math.min(truncated, maxBars)} of {truncated} bars. Playback runs all of it.
        </p>
      )}
      {error && <p className="mt-2 font-mono text-[13px] text-amber">Notation: {error}</p>}
    </div>
  );
}
