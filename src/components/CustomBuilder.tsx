"use client";

/**
 * Build your own scale. Twelve seats; toggle the ones you want.
 *
 * The tonic is always in and cannot be removed — everything in the app is
 * measured from it. Beyond that the engine does not care how many notes you
 * pick: the harmony, the interval cycles and the resolution maths are all
 * computed from whatever set comes out.
 */

import { encodeCustom, decodeCustom, describeSet, CUSTOM_PRESETS } from "@/lib/theory/custom";
import { notePretty, midi } from "@/lib/theory/note";
import { ScaleInstance } from "@/lib/theory/scales";
import { previewAudio } from "@/lib/audio/engine";

const DEG = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];

export default function CustomBuilder({
  code, onChange, scale,
}: { code: string; onChange: (code: string) => void; scale: ScaleInstance }) {
  const semis = decodeCustom(code || encodeCustom([0, 2, 3, 5, 7, 10]));
  const on = new Set(semis);

  const toggle = (s: number) => {
    if (s === 0) return;                       // the tonic stays
    const next = on.has(s) ? semis.filter((x) => x !== s) : [...semis, s].sort((a, b) => a - b);
    if (next.length < 2) return;               // never leave a one-note scale
    onChange(encodeCustom(next));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 12 }, (_, s) => {
          const active = on.has(s);
          const tonic = s === 0;
          return (
            <button
              key={s}
              onClick={() => { toggle(s); if (!active) void previewAudio([60 + s]); }}
              disabled={tonic}
              title={tonic ? "the tonic is always in" : active ? "remove" : "add"}
              className={`h-14 w-12 rounded-xl border text-center transition ${
                active
                  ? "border-gold bg-gold text-[#17130a]"
                  : "border-dashed border-line bg-transparent text-muted hover:border-gold/60 hover:text-cream"
              } ${tonic ? "cursor-default ring-1 ring-cream/30" : ""}`}
            >
              <span className="block text-base font-bold">{DEG[s]}</span>
              <span className={`block font-mono text-[12px] ${active ? "text-[#5a4a12]" : "text-muted/70"}`}>
                {active ? "in" : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="font-mono text-sm text-gold">
          {scale.error ? "—" : scale.notes.map(notePretty).join("  ")}
        </p>
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
          {describeSet(semis)}
        </p>
        {!scale.error && (
          <button className="btn btn-ghost px-3 py-1.5 text-xs"
                  onClick={() => previewAudio(scale.notes.map((n) => midi(n) + 12), 0.16)}>
            ▶ Hear it
          </button>
        )}
      </div>

      <div>
        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">Start from</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CUSTOM_PRESETS.map((p) => (
            <button key={p.name} title={p.note}
              onClick={() => onChange(encodeCustom(p.semis))}
              className="well rounded-lg px-3 py-1.5 text-xs text-muted transition hover:border-gold/60 hover:text-cream">
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {scale.error && <p className="text-sm text-red-hi">{scale.error}</p>}
    </div>
  );
}
