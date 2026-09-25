"use client";

/**
 * The keyboard. Real piano proportions, not seven equal rectangles.
 *
 * White keys on a real instrument are not the same width where they meet the
 * blacks — C, D and E share three blacks across three keys; F through B share
 * four across four. Drawing them as equal blocks with blacks centred on the
 * seams is the single thing that makes a rendered keyboard look wrong to a
 * pianist, so the black-key offsets below are the real ones.
 *
 * Colour rule, held everywhere in the app:
 *   gold  = sounding now      red = the note that was removed
 *   cream = in the scale      dim = not in the scale
 */

import { Note, pc, midi, notePretty } from "@/lib/theory/note";
import { useId } from "react";

interface Props {
  scale: Note[];
  removed: Note | null;
  activeMidi?: number | null;
  /** additional pitch classes to mark — used by improvise mode for chord tones */
  chordTonePcs?: number[];
  startMidi?: number;
  octaves?: number;
  onNote?: (m: number) => void;
  height?: number;
  showLabels?: boolean;
}

const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
/** Real black-key placement, as a fraction of a white key's width from the left
 *  edge of the white key it follows. Not centred on the seam. */
const BLACK: { semi: number; after: number; offset: number }[] = [
  { semi: 1,  after: 0, offset: 0.68 },   // C#
  { semi: 3,  after: 1, offset: 0.82 },   // D#
  { semi: 6,  after: 3, offset: 0.64 },   // F#
  { semi: 8,  after: 4, offset: 0.76 },   // G#
  { semi: 10, after: 5, offset: 0.88 },   // A#
];

export default function Keyboard({
  scale, removed, activeMidi = null, chordTonePcs, startMidi = 60,
  octaves = 2, onNote, height = 132, showLabels = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const inScale = new Set(scale.map(pc));
  const chordSet = chordTonePcs ? new Set(chordTonePcs) : null;
  const removedPc = removed ? pc(removed) : -1;

  const W = 40;
  const BW = W * 0.62;
  const BH = height * 0.63;
  const whiteCount = octaves * 7;
  const width = whiteCount * W;
  const felt = 7;

  const whites: { m: number; x: number }[] = [];
  for (let o = 0; o < octaves; o++)
    WHITE_SEMIS.forEach((s, i) =>
      whites.push({ m: startMidi + o * 12 + s, x: (o * 7 + i) * W })
    );

  const blacks: { m: number; x: number }[] = [];
  for (let o = 0; o < octaves; o++)
    for (const b of BLACK)
      blacks.push({
        m: startMidi + o * 12 + b.semi,
        x: (o * 7 + b.after) * W + b.offset * W,
      });

  const state = (m: number) => {
    const p = ((m % 12) + 12) % 12;
    if (activeMidi === m) return "active";
    if (p === removedPc) return "removed";
    if (chordSet?.has(p)) return "chord";
    if (inScale.has(p)) return "scale";
    return "off";
  };

  return (
    <div className="overflow-x-auto">
      <svg
        width={width} height={height + felt + 6} role="img"
        aria-label={`Keyboard: ${scale.map(notePretty).join(" ")}${
          removed ? `, ${notePretty(removed)} removed` : ""}`}
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`w${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF7" /><stop offset="88%" stopColor="#E8E2D4" />
            <stop offset="100%" stopColor="#CFC8B8" />
          </linearGradient>
          <linearGradient id={`wo${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26221F" /><stop offset="100%" stopColor="#1A1714" />
          </linearGradient>
          <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B2724" /><stop offset="72%" stopColor="#111010" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6DE84" /><stop offset="100%" stopColor="#C9A227" />
          </linearGradient>
          <linearGradient id={`c${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8E7A2E" /><stop offset="100%" stopColor="#6A5A20" />
          </linearGradient>
          <linearGradient id={`felt${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B1A20" /><stop offset="100%" stopColor="#4A0F14" />
          </linearGradient>
        </defs>

        {/* the felt strip behind the keys — the detail that reads as "piano" */}
        <rect x={0} y={0} width={width} height={felt} fill={`url(#felt${uid})`} rx={1} />

        {whites.map(({ m, x }) => {
          const st = state(m);
          const fill =
            st === "active" ? `url(#g${uid})` :
            st === "chord"  ? "#F0E4B8" :
            st === "scale"  ? `url(#w${uid})` :
            `url(#wo${uid})`;
          return (
            <g key={`w${m}`} onClick={() => onNote?.(m)}
               style={{ cursor: onNote ? "pointer" : "default" }}>
              <rect x={x + 0.5} y={felt} width={W - 1} height={height}
                    rx={3} fill={fill}
                    stroke={st === "removed" ? "#C4353C" : "#0B0A09"}
                    strokeWidth={st === "removed" ? 2.5 : 1} />
              {/* front lip */}
              <rect x={x + 0.5} y={felt + height - 5} width={W - 1} height={5}
                    fill="#00000028" rx={2} />
              {st === "removed" && (
                <>
                  <line x1={x + W * 0.28} y1={felt + height * 0.62}
                        x2={x + W * 0.72} y2={felt + height * 0.86}
                        stroke="#C4353C" strokeWidth={3} strokeLinecap="round" />
                  <line x1={x + W * 0.72} y1={felt + height * 0.62}
                        x2={x + W * 0.28} y2={felt + height * 0.86}
                        stroke="#C4353C" strokeWidth={3} strokeLinecap="round" />
                </>
              )}
              {showLabels && st !== "off" && st !== "removed" && (
                <text x={x + W / 2} y={felt + height - 14} textAnchor="middle"
                      className="font-mono" fontSize={11}
                      fill={st === "active" ? "#4A3B08" : "#A79E94"}>
                  {notePretty(scale.find((s) => pc(s) === ((m % 12) + 12) % 12) ?? { letter: "C", alt: 0, octave: 4 } as Note)}
                </text>
              )}
            </g>
          );
        })}

        {blacks.map(({ m, x }) => {
          const st = state(m);
          const fill =
            st === "active" ? `url(#g${uid})` :
            st === "chord"  ? `url(#c${uid})` :
            st === "scale"  ? "#8A7420" :
            `url(#b${uid})`;
          return (
            <g key={`b${m}`} onClick={() => onNote?.(m)}
               style={{ cursor: onNote ? "pointer" : "default" }}>
              <rect x={x} y={felt} width={BW} height={BH} rx={2.5} fill={fill}
                    stroke={st === "removed" ? "#C4353C" : "#000"}
                    strokeWidth={st === "removed" ? 2.5 : 1} />
              {/* the highlight along the top edge that gives a black key its shine */}
              <rect x={x + BW * 0.16} y={felt + 2} width={BW * 0.68} height={BH * 0.13}
                    rx={1.5} fill="#ffffff" opacity={st === "off" ? 0.07 : 0.16} />
              {st === "removed" && (
                <line x1={x + BW * 0.22} y1={felt + BH * 0.55}
                      x2={x + BW * 0.78} y2={felt + BH * 0.85}
                      stroke="#C4353C" strokeWidth={2.5} strokeLinecap="round" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
