"use client";

/**
 * A two-hand chord staff: treble for the right hand, bass for the left, one
 * quarter-note chord per beat, four to a bar, the chord name above each chord.
 * What you see is what you hear: one chord on the page per step of the drill,
 * rests included, so the chord sounding now is exactly the one that turns
 * gold (gold means "sounding now" and nothing else).
 *
 * The staff wraps into lines to fit its box, justified, and scales down on a
 * phone rather than scrolling sideways. Accidentals follow the key signature
 * and carry through the bar, per staff, as in any printed part.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ALT_NAME, keySignatureAlterations, MAJOR_KEYS, midi, Note, notePretty, vexKey } from "@/lib/theory/note";

export interface StaffChord {
  rh: Note[];
  lh: Note[];
  label: string;
}

const INK = "#E8E0D2";
const GOLD = "#C9A227";
const LABEL = "rgba(244,239,228,0.86)";

/** Logical (unscaled) sizes, in VexFlow's own units. */
const MIN_W = 500;      // narrower boxes scale the drawing down instead
const BEAT_W = 46;      // the least room a quarter-note chord gets
const BAR_PAD = 20;

/** Split a chord between the hands: the lowest `left` notes go to the left
 *  hand, the rest to the right. */
export const byHands = (notes: Note[], label: string, left = 0): StaffChord => {
  const up = [...notes].sort((a, b) => midi(a) - midi(b));
  return { rh: up.slice(left), lh: up.slice(0, left), label };
};

export default function ChordStaff({
  chords, keySignature = null, activeIndex = -1, ariaLabel, beatsPerBar = 4,
}: {
  /** one entry per beat; null is a rest */
  chords: (StaffChord | null)[];
  keySignature?: string | null;
  activeIndex?: number;
  ariaLabel: string;
  beatsPerBar?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const parts = useRef<{ groups: SVGGElement[]; label: SVGTextElement | null }[]>([]);
  const [boxW, setBoxW] = useState(0);
  const [drawn, setDrawn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const box = hostRef.current;
    if (!box) return;
    const measure = () => setBoxW(Math.floor(box.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || !chords.length || boxW < 40) return;
    (async () => {
      try {
        if (document.fonts?.load) await document.fonts.load('30pt "Bravura"');
      } catch { /* bundled with vexflow; carry on */ }
      const VF = (await import("vexflow")).Flow;
      if (cancelled || !hostRef.current) return;
      const el = hostRef.current;
      el.innerHTML = "";
      try {
        const sig = keySignature && MAJOR_KEYS[keySignature] !== undefined ? keySignature : null;
        const keyAlts = sig
          ? keySignatureAlterations(sig)
          : ({ C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 } as Record<string, number>);

        /* ── layout: logical width, lines, bars per line ─────────────── */
        const scale = Math.min(1, boxW / MIN_W);
        const W = boxW / scale;
        const nBars = Math.ceil(chords.length / beatsPerBar);
        const lineStart = 44 + Math.abs(sig ? MAJOR_KEYS[sig] : 0) * 10;
        const avail = W - 12 - lineStart;
        const minBar = beatsPerBar * BEAT_W + BAR_PAD;
        const fit = Math.max(1, Math.floor(avail / minBar));
        const lines = Math.ceil(nBars / fit);
        const perLine = Math.ceil(nBars / lines);
        const barW = avail / perLine;
        /* Two label rows when names would touch. Displayed at 14–15px. */
        const beatShown = ((barW - BAR_PAD) / beatsPerBar) * scale;
        const stagger = beatShown < 64;
        const fontPx = (scale < 1 ? 14 : 15) / scale;
        const labelRow = fontPx * 1.3;
        const labelH = labelRow * (stagger ? 2 : 1) + 6;
        /* A part with nothing for the left hand is printed on the treble alone. */
        const grand = chords.some((c) => c && c.lh.length);
        const sysH = labelH + (grand ? 200 : 112);

        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(W, sysH * lines);
        const ctx = renderer.getContext();
        ctx.setFillStyle(INK);
        ctx.setStrokeStyle(INK);
        const svg = el.querySelector("svg")!;
        const NS = "http://www.w3.org/2000/svg";
        /* The page's own face, named outright: the SVG itself is set in
           Bravura, whose ♭ and ♯ are notation-sized. */
        const pageFont = getComputedStyle(document.body).fontFamily.replace(/"/g, "'");

        const out: { groups: SVGGElement[]; label: SVGTextElement | null }[] =
          chords.map(() => ({ groups: [], label: null }));
        const newGroups = (before: number) =>
          Array.from(el.querySelectorAll<SVGGElement>("g.vf-stavenote")).slice(before);

        for (let bar = 0; bar < nBars; bar++) {
          const line = Math.floor(bar / perLine);
          const col = bar % perLine;
          const first = col === 0;
          const y0 = line * sysH;
          const x = 6 + (first ? 0 : lineStart + col * barW);
          const w = first ? lineStart + barW : barW;
          const t = new VF.Stave(x, y0 + labelH - 22, w);
          const b = new VF.Stave(x, y0 + labelH + 84, w);
          if (first) {
            t.addClef("treble"); b.addClef("bass");
            if (sig) { t.addKeySignature(sig); b.addKeySignature(sig); }
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

          /* One voice per staff. Accidentals carry through the bar, per staff. */
          const slots = Array.from({ length: beatsPerBar }, (_, k) => chords[bar * beatsPerBar + k] ?? null);
          const voiceFor = (hand: "rh" | "lh", clef: "treble" | "bass") => {
            const state = new Map<string, number>();
            const empty = slots.every((c) => !c || !c[hand].length);
            if (empty)
              return [new VF.StaveNote({ clef, keys: [clef === "treble" ? "b/4" : "d/3"], duration: "wr", align_center: true } as any)];
            return slots.map((c) => {
              const ns = c ? [...c[hand]].sort((p, q) => midi(p) - midi(q)) : [];
              if (!ns.length)
                return new VF.StaveNote({ clef, keys: [clef === "treble" ? "b/4" : "d/3"], duration: "qr" });
              const sn = new VF.StaveNote({ clef, keys: ns.map(vexKey), duration: "q", auto_stem: true });
              ns.forEach((n, k) => {
                const at = `${n.letter}${n.octave}`;
                const cur = state.has(at) ? state.get(at)! : keyAlts[n.letter];
                if (n.alt !== cur) {
                  sn.addModifier(new VF.Accidental(n.alt === 0 ? "n" : ALT_NAME[String(n.alt)]), k);
                  state.set(at, n.alt);
                }
              });
              return sn;
            });
          };
          const tn = voiceFor("rh", "treble");
          const bn = voiceFor("lh", "bass");
          const tv = new VF.Voice({ num_beats: beatsPerBar, beat_value: 4 }).addTickables(tn);
          const bv = new VF.Voice({ num_beats: beatsPerBar, beat_value: 4 }).addTickables(bn);
          const start = Math.max(t.getNoteStartX(), b.getNoteStartX());
          t.setNoteStartX(start);
          b.setNoteStartX(start);
          const voices = grand ? [tv, bv] : [tv];
          const fmt = new VF.Formatter().joinVoices([tv]);
          if (grand) fmt.joinVoices([bv]);
          fmt.format(voices, Math.max(40, t.getNoteEndX() - start - 12));

          let seen = el.querySelectorAll("g.vf-stavenote").length;
          tv.draw(ctx, t);
          const tg = newGroups(seen);
          seen += tg.length;
          if (grand) bv.draw(ctx, b);
          const bg = grand ? newGroups(seen) : [];

          slots.forEach((c, k) => {
            const i = bar * beatsPerBar + k;
            if (!c || i >= chords.length) return;
            const g = out[i].groups;
            if (tn.length === beatsPerBar && tg[k]) g.push(tg[k]);
            if (grand && bn.length === beatsPerBar && bg[k]) g.push(bg[k]);
            const head = (tn.length === beatsPerBar || !grand ? tn[k] ?? tn[0] : bn[k]) as any;
            const cx = head.getAbsoluteX() + 6;
            const row = stagger ? i % 2 : 0;
            const txt = document.createElementNS(NS, "text");
            txt.setAttribute("x", String(cx));
            txt.setAttribute("y", String(y0 + labelRow * (row + 1) - 4));
            txt.setAttribute("text-anchor", "middle");
            txt.setAttribute("fill", LABEL);
            txt.setAttribute("style", `font-family: ${pageFont}; font-weight: 700; font-size: ${fontPx.toFixed(1)}px`);
            txt.textContent = c.label;
            svg.appendChild(txt);
            out[i].label = txt;
          });
        }

        svg.setAttribute("viewBox", `0 0 ${W} ${sysH * lines}`);
        svg.setAttribute("width", "100%");
        svg.removeAttribute("height");
        svg.style.height = "auto";
        svg.style.display = "block";
        parts.current = out;
        setDrawn((d) => d + 1);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "notation failed");
      }
    })();
    return () => { cancelled = true; };
  }, [chords, keySignature, boxW, beatsPerBar]);

  useEffect(() => {
    parts.current.forEach((p, i) => {
      const on = i === activeIndex;
      for (const g of p.groups) {
        g.style.fill = on ? GOLD : "";
        g.style.stroke = on ? GOLD : "";
      }
      if (p.label) p.label.setAttribute("fill", on ? GOLD : LABEL);
    });
  }, [activeIndex, drawn]);

  return (
    <div role="img" aria-label={ariaLabel}>
      <div ref={boxRef} className="rounded-xl border border-line bg-[#171512] px-2 pb-1 pt-2 sm:px-3">
        <div ref={hostRef} className="vf-host" aria-hidden="true" />
      </div>
      {error && <p className="mt-2 font-mono text-[13px] text-amber">Notation: {error}</p>}
      <p className="sr-only">
        {chords.map((c) => (c ? `${c.label}: ${[...c.lh, ...c.rh].map(notePretty).join(" ")}` : "rest")).join("; ")}
      </p>
    </div>
  );
}
