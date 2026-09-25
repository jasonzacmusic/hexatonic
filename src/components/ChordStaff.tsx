"use client";

/**
 * A two-hand chord staff: treble for the right hand, bass for the left, one
 * whole-note chord per bar, the chord name above each bar. The bar sounding
 * now turns gold (gold means "sounding now" and nothing else). Accidentals
 * follow the key signature and reset every bar, as in any printed part.
 */

import { useEffect, useRef, useState } from "react";
import { ALT_NAME, keySignatureAlterations, MAJOR_KEYS, Note, notePretty, vexKey } from "@/lib/theory/note";

export interface StaffChord {
  rh: Note[];
  lh: Note[];
  label: string;
}

const INK = "#E8E0D2";
const GOLD = "#C9A227";

export default function ChordStaff({
  chords, keySignature = null, activeIndex = -1, ariaLabel,
}: {
  chords: StaffChord[];
  keySignature?: string | null;
  activeIndex?: number;
  ariaLabel: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const groups = useRef<SVGGElement[][]>([]);
  const [labels, setLabels] = useState<{ x: number; text: string }[]>([]);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || !chords.length) return;
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
        const alts = sig
          ? keySignatureAlterations(sig)
          : ({ C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 } as Record<string, number>);
        const barW = 96;
        const firstExtra = 58 + Math.abs(sig ? MAJOR_KEYS[sig] : 0) * 11;
        const w = 20 + firstExtra + barW * chords.length;
        const h = 236;
        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(w, h);
        const ctx = renderer.getContext();
        ctx.setFillStyle(INK);
        ctx.setStrokeStyle(INK);

        const out: { x: number; text: string }[] = [];
        let x = 10;
        chords.forEach((c, i) => {
          const sw = i === 0 ? barW + firstExtra : barW;
          const t = new VF.Stave(x, 4, sw);
          const b = new VF.Stave(x, 112, sw);
          if (i === 0) {
            t.addClef("treble"); b.addClef("bass");
            if (sig) { t.addKeySignature(sig); b.addKeySignature(sig); }
          }
          t.setContext(ctx).draw();
          b.setContext(ctx).draw();
          if (i === 0) {
            new VF.StaveConnector(t, b).setType("brace").setContext(ctx).draw();
            new VF.StaveConnector(t, b).setType("singleLeft").setContext(ctx).draw();
          }
          new VF.StaveConnector(t, b).setType("singleRight").setContext(ctx).draw();

          const make = (ns: Note[], clef: "treble" | "bass") => {
            if (!ns.length)
              return new VF.StaveNote({ clef, keys: [clef === "treble" ? "b/4" : "d/3"], duration: "wr" });
            const sn = new VF.StaveNote({ clef, keys: ns.map(vexKey), duration: "w" });
            ns.forEach((n, k) => {
              if (n.alt !== alts[n.letter])
                sn.addModifier(new VF.Accidental(n.alt === 0 ? "n" : ALT_NAME[String(n.alt)]), k);
            });
            return sn;
          };
          const tn = make(c.rh, "treble");
          const bn = make(c.lh, "bass");
          const tv = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables([tn]);
          const bv = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables([bn]);
          const start = Math.max(t.getNoteStartX(), b.getNoteStartX());
          t.setNoteStartX(start);
          b.setNoteStartX(start);
          new VF.Formatter().joinVoices([tv]).joinVoices([bv])
            .format([tv, bv], Math.max(20, t.getNoteEndX() - start - 14));
          tv.draw(ctx, t);
          bv.draw(ctx, b);
          const head = (c.rh.length ? tn : bn) as any;
          out.push({ x: head.getAbsoluteX() + 9, text: c.label });
          x += sw;
        });

        const gs = Array.from(el.querySelectorAll<SVGGElement>("svg g.vf-stavenote"));
        groups.current = chords.map((_, i) => [gs[i * 2], gs[i * 2 + 1]].filter(Boolean));
        setLabels(out);
        setWidth(w);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "notation failed");
      }
    })();
    return () => { cancelled = true; };
  }, [chords, keySignature]);

  useEffect(() => {
    groups.current.forEach((pair, i) => {
      for (const g of pair) {
        g.style.fill = i === activeIndex ? GOLD : "";
        g.style.stroke = i === activeIndex ? GOLD : "";
      }
    });
  }, [activeIndex, labels]);

  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="overflow-x-auto rounded-xl border border-line bg-[#171512] px-3 pb-2 pt-3">
        <div style={{ minWidth: 520, maxWidth: width ? width * 1.2 : undefined }}>
          <div className="relative h-7" aria-hidden="true">
            {labels.map((l, i) => (
              <span key={i}
                className={`absolute top-0 -translate-x-1/2 whitespace-nowrap text-[15px] font-bold ${
                  i === activeIndex ? "text-gold" : "text-cream/85"}`}
                style={{ left: width ? `${(l.x / width) * 100}%` : 0 }}>
                {l.text}
              </span>
            ))}
          </div>
          <div ref={hostRef} className="vf-host" aria-hidden="true" />
        </div>
      </div>
      {error && <p className="mt-2 font-mono text-[13px] text-amber">Notation: {error}</p>}
      <p className="sr-only">{chords.map((c) => `${c.label}: ${[...c.lh, ...c.rh].map(notePretty).join(" ")}`).join("; ")}</p>
    </div>
  );
}
