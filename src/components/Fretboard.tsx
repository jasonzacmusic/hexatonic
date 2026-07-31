"use client";

/**
 * The guitar fretboard — the same visual language as the keyboard, on strings.
 *
 * Colour rule, held everywhere in the app:
 *   gold  = sounding now      red = the note that was removed
 *   cream = in the scale      (everything else stays bare wood)
 *
 * Standard tuning, low E at the BOTTOM the way a player sees their own hands.
 * Labels are plain note names — never "E2"/"E4".
 */

import { Note, pc, notePretty } from "@/lib/theory/note";
import { useId } from "react";

interface Props {
  scale: Note[];
  removed: Note | null;
  activePc?: number | null;
  /** additional pitch classes to brighten — improvise mode's chord tones */
  chordTonePcs?: number[];
  frets?: number;
  onNote?: (midi: number) => void;
  height?: number;
}

/** Open strings, low to high: E A D G B E. Drawn bottom-up. */
const OPEN = [40, 45, 50, 55, 59, 64];
const INLAYS = [3, 5, 7, 9, 12];
/** Plain flat-leaning names for chord tones that live outside the scale. */
const PC_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

export default function Fretboard({
  scale, removed, activePc = null, chordTonePcs, frets = 12, onNote, height = 190,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const inScale = new Map<number, Note>();
  for (const n of scale) if (!inScale.has(pc(n))) inScale.set(pc(n), n);
  const chordSet = chordTonePcs ? new Set(chordTonePcs) : null;
  const removedPc = removed ? pc(removed) : -1;

  const nutW = 34;
  const fretW = 58;
  const width = nutW + frets * fretW;
  const top = 16, bottom = 26;
  const boardH = height - top - bottom;
  const stringY = (s: number) => top + ((5 - s) / 5) * boardH;   // s=0 low E → bottom
  const fretX = (f: number) => nutW + f * fretW;
  const dotX = (f: number) => (f === 0 ? nutW / 2 : nutW + (f - 0.5) * fretW);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img" style={{ display: "block" }}
           aria-label={`Fretboard: ${scale.map(notePretty).join(" ")}${
             removed ? `, ${notePretty(removed)} removed` : ""}`}>
        <defs>
          <linearGradient id={`wood${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#241B12" />
            <stop offset="100%" stopColor="#160F09" />
          </linearGradient>
          <linearGradient id={`dot${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6DE84" /><stop offset="100%" stopColor="#C9A227" />
          </linearGradient>
        </defs>

        {/* board + nut */}
        <rect x={0} y={top - 8} width={width} height={boardH + 16} rx={6} fill={`url(#wood${uid})`} />
        <rect x={nutW - 4} y={top - 8} width={4} height={boardH + 16} fill="#D9D2C2" rx={1} />

        {/* frets */}
        {Array.from({ length: frets }, (_, i) => i + 1).map((f) => (
          <line key={f} x1={fretX(f)} y1={top - 6} x2={fretX(f)} y2={top + boardH + 6}
                stroke="#4A4038" strokeWidth={f === 12 ? 3 : 2} />
        ))}

        {/* inlays */}
        {INLAYS.filter((f) => f <= frets).map((f) =>
          f === 12 ? (
            <g key={f}>
              <circle cx={dotX(f)} cy={top + boardH * 0.32} r={4.5} fill="#3A322A" />
              <circle cx={dotX(f)} cy={top + boardH * 0.68} r={4.5} fill="#3A322A" />
            </g>
          ) : (
            <circle key={f} cx={dotX(f)} cy={top + boardH / 2} r={4.5} fill="#3A322A" />
          )
        )}

        {/* strings — thicker at the bottom, like the real thing */}
        {OPEN.map((_, s) => (
          <line key={s} x1={0} y1={stringY(s)} x2={width} y2={stringY(s)}
                stroke="#B7AB92" strokeOpacity={0.75} strokeWidth={2.6 - s * 0.35} />
        ))}

        {/* fret numbers */}
        {INLAYS.filter((f) => f <= frets).map((f) => (
          <text key={f} x={dotX(f)} y={height - 7} textAnchor="middle"
                className="font-mono" fontSize={10} fill="#6A6158">{f}</text>
        ))}

        {/* the notes */}
        {OPEN.map((open, s) =>
          Array.from({ length: frets + 1 }, (_, f) => {
            const m = open + f;
            const p = ((m % 12) + 12) % 12;
            const isRemoved = p === removedPc;
            const src = inScale.get(p);
            const isChordOnly = !src && (chordSet?.has(p) ?? false);
            if (!src && !isRemoved && !isChordOnly) return null;
            const on = activePc !== null && p === activePc;
            const isChord = chordSet?.has(p) ?? false;
            const x = dotX(f), y = stringY(s);
            const r = on ? 11.5 : 9.5;
            return (
              <g key={`${s}-${f}`} onClick={() => onNote?.(m)}
                 style={{ cursor: onNote ? "pointer" : "default" }}>
                {isRemoved ? (
                  <circle cx={x} cy={y} r={r} fill="#0A0908" stroke="#C4353C"
                          strokeWidth={2.2} strokeDasharray="4 2.6" />
                ) : (
                  <circle cx={x} cy={y} r={r}
                          fill={on ? `url(#dot${uid})` : isChord ? "#F0E4B8" : "#E4DCCB"}
                          stroke="#0B0A09" strokeWidth={1}
                          style={{ transition: "r 90ms linear, fill 90ms linear" }} />
                )}
                {!isRemoved && (
                  <text x={x} y={y + 3.5} textAnchor="middle" className="font-mono"
                        fontSize={9.5} fontWeight={700}
                        fill={on ? "#4A3B08" : "#17130a"}>
                    {src ? notePretty(src) : PC_NAMES[p]}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}
