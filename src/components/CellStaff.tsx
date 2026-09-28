"use client";

/**
 * A staff for material laid on a rhythm (src/lib/theory/rhythmCell.ts): one
 * chord or note per hit, in 4/4, engraved the house way —
 *   · key signature on every system (addKeySignature) and accidentals from
 *     Accidental.applyAccidentals, per bar, per staff;
 *   · beams from Beam.generateBeams, one group per beat, never across a rest
 *     (so rhythm cell 1's "eighth rest + eighth" keeps its flag);
 *   · dotted notes carry a real dot (Dot.buildAndAttach).
 * Each chord is drawn in its own colour (shape A blue, shape B green); the one
 * sounding now turns gold, and gold means nothing else. A hands-off bar shows
 * a whole rest and the word "clap".
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { midi, Note, notePretty, vexKey } from "@/lib/theory/note";
import type { CellLayout } from "@/lib/theory/rhythmCell";

export interface CellItem {
  /** right hand (treble) */
  rh: Note[];
  /** left hand (bass); empty = none */
  lh: Note[];
  label?: string;
  /** ink for this item when it is not sounding */
  color: string;
}

const INK = "#E8E0D2";
const GOLD = "#C9A227";
const MIN_BAR = 250;

export default function CellStaff({
  layout, items, keySignature, activeItem = -1, activeGapBar = -1, ariaLabel, big = false,
}: {
  layout: CellLayout<unknown>;
  items: (CellItem | null)[];
  keySignature: string | null;
  activeItem?: number;
  /** a gap bar that is sounding (its "clap" lights) */
  activeGapBar?: number;
  ariaLabel: string;
  big?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const parts = useRef<Map<number, { groups: SVGElement[]; label: SVGTextElement | null; color: string }>>(new Map());
  const claps = useRef<Map<number, SVGTextElement>>(new Map());
  const [boxW, setBoxW] = useState(0);
  const [drawn, setDrawn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setBoxW(Math.floor(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || boxW < 40 || !layout.engraving.length) return;
    (async () => {
      try { if (document.fonts?.load) await document.fonts.load('30pt "Bravura"'); } catch { /* bundled */ }
      const VF = (await import("vexflow")).Flow;
      if (cancelled || !hostRef.current) return;
      const el = hostRef.current;
      el.innerHTML = "";
      try {
        const sig = keySignature || null;
        const grand = items.some((it) => it && it.lh.length);
        const nBars = layout.engraving.length;
        const lead = 70; // clef + time signature
        const sigW = sig ? 14 * sigCount(sig) : 0;
        const W = Math.max(boxW, 500);
        const avail = W - 34 - lead - sigW;
        const perLine = Math.max(1, Math.min(nBars, Math.floor(avail / MIN_BAR)));
        const lines = Math.ceil(nBars / perLine);
        const barW = avail / perLine;
        const fontPx = big ? 26 : 17;
        const rowH = fontPx * 1.25;
        const labelH = rowH * 2 + 10;
        const sysH = labelH + (grand ? 220 : 120);

        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(W, sysH * lines);
        const ctx = renderer.getContext();
        ctx.setFillStyle(INK);
        ctx.setStrokeStyle(INK);
        const svg = el.querySelector("svg")!;
        const NS = "http://www.w3.org/2000/svg";
        const pageFont = `${getComputedStyle(document.body).fontFamily.replace(/"/g, "'")}, system-ui, sans-serif`;
        const out = new Map<number, { groups: SVGElement[]; label: SVGTextElement | null; color: string }>();
        const clapOut = new Map<number, SVGTextElement>();

        const text = (x: number, y: number, s: string, fill: string, size = fontPx) => {
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", String(x));
          t.setAttribute("y", String(y));
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("fill", fill);
          t.setAttribute("style", `font-family: ${pageFont}; font-weight: 800; font-size: ${size}px`);
          /* ♯ and ♭ from the mono face: the display face has no sharp */
          for (const part of s.split(/([♯♭])/)) {
            if (!part) continue;
            if (part === "♯" || part === "♭") {
              const sp = document.createElementNS(NS, "tspan");
              sp.setAttribute("style", "font-family: var(--font-plex-mono), ui-monospace, monospace; font-weight: 700");
              sp.textContent = part;
              t.appendChild(sp);
            } else t.appendChild(document.createTextNode(part));
          }
          svg.appendChild(t);
          return t;
        };

        /* chord names take a second row when they would touch */
        let rowEnd = [-Infinity, -Infinity];
        let rowLine = -1;
        for (let bar = 0; bar < nBars; bar++) {
          const line = Math.floor(bar / perLine);
          if (line !== rowLine) { rowLine = line; rowEnd = [-Infinity, -Infinity]; }
          const col = bar % perLine;
          const first = col === 0;
          const y0 = line * sysH;
          const x = 26 + (first ? 0 : lead + sigW + col * barW);
          const w = first ? lead + sigW + barW : barW;
          const t = new VF.Stave(x, y0 + labelH - 18, w);
          const b = new VF.Stave(x, y0 + labelH + 92, w);
          if (first) {
            t.addClef("treble"); b.addClef("bass");
            if (sig) { t.addKeySignature(sig); b.addKeySignature(sig); }
            if (line === 0) { t.addTimeSignature("4/4"); b.addTimeSignature("4/4"); }
          }
          if (bar === nBars - 1) { t.setEndBarType(VF.Barline.type.END); b.setEndBarType(VF.Barline.type.END); }
          t.setContext(ctx).draw();
          if (grand) {
            b.setContext(ctx).draw();
            if (first) {
              new VF.StaveConnector(t, b).setType("brace").setContext(ctx).draw();
              new VF.StaveConnector(t, b).setType("singleLeft").setContext(ctx).draw();
            }
            new VF.StaveConnector(t, b).setType(bar === nBars - 1 ? "boldDoubleRight" : "singleRight").setContext(ctx).draw();
          }

          const eng = layout.engraving[bar];
          const build = (hand: "rh" | "lh", clef: "treble" | "bass") => {
            const restKey = clef === "treble" ? "b/4" : "d/3";
            if (eng.gap || eng.slots.every((s) => s.item < 0 || !items[s.item]?.[hand].length))
              return { notes: [new VF.StaveNote({ clef, keys: [restKey], duration: "wr", align_center: true } as any)], map: [] as number[] };
            const map: number[] = [];
            const notes = eng.slots.map((s) => {
              const it = s.item >= 0 ? items[s.item] : null;
              const ns = it ? [...it[hand]].sort((p, q) => midi(p) - midi(q)) : [];
              const dotted = s.slot.vex.endsWith("d");
              const base = dotted ? s.slot.vex.slice(0, -1) : s.slot.vex;
              /* "8d" gives the dotted length; buildAndAttach draws the dot */
              const sn = ns.length
                ? new VF.StaveNote({ clef, keys: ns.map(vexKey), duration: s.slot.vex, auto_stem: true })
                : new VF.StaveNote({ clef, keys: [restKey], duration: `${base}${dotted ? "dr" : "r"}` });
              if (dotted) VF.Dot.buildAndAttach([sn], { all: true });
              if (ns.length && it) sn.setStyle({ fillStyle: it.color, strokeStyle: it.color });
              map.push(ns.length ? s.item : -1);
              return sn;
            });
            return { notes, map };
          };
          const tr = build("rh", "treble");
          const bs = build("lh", "bass");
          const tv = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(tr.notes);
          const bv = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(bs.notes);
          if (sig) {
            VF.Accidental.applyAccidentals([tv], sig);
            if (grand) VF.Accidental.applyAccidentals([bv], sig);
          } else {
            VF.Accidental.applyAccidentals([tv], "C");
            if (grand) VF.Accidental.applyAccidentals([bv], "C");
          }
          const beamOpts = { groups: [new VF.Fraction(1, 4)], beam_rests: false, maintain_stem_directions: false };
          const tBeams = VF.Beam.generateBeams(tr.notes, beamOpts);
          const bBeams = grand ? VF.Beam.generateBeams(bs.notes, beamOpts) : [];
          const start = Math.max(t.getNoteStartX(), b.getNoteStartX());
          t.setNoteStartX(start);
          b.setNoteStartX(start);
          const fmt = new VF.Formatter().joinVoices([tv]);
          if (grand) fmt.joinVoices([bv]);
          fmt.format(grand ? [tv, bv] : [tv], Math.max(60, t.getNoteEndX() - start - 16));
          tv.draw(ctx, t);
          if (grand) bv.draw(ctx, b);
          tBeams.forEach((bm: any) => bm.setContext(ctx).draw());
          bBeams.forEach((bm: any) => bm.setContext(ctx).draw());

          const collect = (notes: any[], map: number[]) => notes.forEach((n, k) => {
            const item = map[k];
            if (item === undefined || item < 0) return;
            const g = n.getSVGElement?.() as SVGElement | undefined;
            const it = items[item]!;
            const entry = out.get(item) ?? { groups: [], label: null, color: it.color };
            if (g) entry.groups.push(g);
            out.set(item, entry);
          });
          collect(tr.notes, tr.map);
          if (grand) collect(bs.notes, bs.map);
          /* beams stay ink: a beam joins two chords, so it belongs to neither colour */

          /* the chord names above, and "clap" over a hands-off bar */
          if (eng.gap) {
            clapOut.set(bar, text(x + w / 2 + (first ? (lead + sigW) / 2 : 0), y0 + rowH * 2, "clap", "rgba(244,239,228,0.55)"));
          } else {
            tr.notes.forEach((n: any, k: number) => {
              const item = tr.map[k];
              if (item === undefined || item < 0) return;
              const it = items[item]!;
              if (!it.label) return;
              const cx = n.getAbsoluteX() + 6;
              const half = (it.label.length * fontPx * 0.6) / 2 + 4;
              const row = cx - half >= rowEnd[1] ? 1 : cx - half >= rowEnd[0] ? 0 : rowEnd[1] <= rowEnd[0] ? 1 : 0;
              rowEnd[row] = cx + half;
              const lbl = text(cx, y0 + rowH * (row + 1), it.label, it.color);
              const e = out.get(item);
              if (e) e.label = lbl;
            });
          }
        }

        svg.setAttribute("viewBox", `0 0 ${W} ${sysH * lines}`);
        svg.setAttribute("width", "100%");
        svg.removeAttribute("height");
        svg.style.height = "auto";
        svg.style.display = "block";
        parts.current = out;
        claps.current = clapOut;
        setDrawn((d) => d + 1);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "notation failed");
      }
    })();
    return () => { cancelled = true; };
  }, [layout, items, keySignature, boxW, big]);

  /* Light the sounding chord without re-engraving. */
  useLayoutEffect(() => {
    parts.current.forEach((p, i) => {
      const on = i === activeItem;
      const c = on ? GOLD : p.color;
      for (const g of p.groups) {
        g.style.fill = c;
        g.style.stroke = c;
        g.querySelectorAll<SVGElement>("path, rect").forEach((x) => { x.style.fill = c; x.style.stroke = c; });
      }
      if (p.label) p.label.setAttribute("fill", c);
    });
    claps.current.forEach((t, bar) =>
      t.setAttribute("fill", bar === activeGapBar ? GOLD : "rgba(244,239,228,0.55)"));
  }, [activeItem, activeGapBar, drawn]);

  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="rounded-xl border border-line bg-[#171512] px-2 pb-1 pt-3 sm:px-3">
        <div ref={hostRef} className="vf-host" aria-hidden="true" />
      </div>
      {error && <p className="mt-2 font-mono text-[13px] text-amber">Notation: {error}</p>}
      <p className="sr-only">
        {items.map((c) => (c ? `${c.label ?? ""} ${[...c.lh, ...c.rh].map(notePretty).join(" ")}` : "rest")).join("; ")}
      </p>
    </div>
  );
}

function sigCount(sig: string): number {
  const SHARPS = ["G", "D", "A", "E", "B", "F#", "C#"];
  const FLATS = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
  const s = SHARPS.indexOf(sig);
  if (s >= 0) return s + 1;
  const f = FLATS.indexOf(sig);
  return f >= 0 ? f + 1 : 0;
}
