"use client";

/**
 * The ghost note is the whole idea made visible: this app is SUBTRACTIVE, so the
 * note we removed is drawn struck through in red rather than simply absent.
 *
 * The colour rule, held everywhere in the app:
 *   gold  = the note sounding now
 *   red   = the note that was removed
 *   cream = the rest of the scale
 */

import { Note, pc, midi, noteName } from "@/lib/theory/note";

interface Props {
  scale: Note[];
  removed: Note | null;
  activeMidi?: number | null;
  startMidi?: number;
  octaves?: number;
  onNote?: (m: number) => void;
  height?: number;
}

const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

export default function Keyboard({
  scale, removed, activeMidi = null, startMidi = 60, octaves = 2,
  onNote, height = 118,
}: Props) {
  const inScale = new Set(scale.map(pc));
  const removedPc = removed ? pc(removed) : -1;
  const W = 34;
  const whiteCount = octaves * 7;
  const width = whiteCount * W + 2;

  const whites: { m: number; x: number }[] = [];
  for (let o = 0; o < octaves; o++)
    WHITE_OFFSETS.forEach((w, i) => whites.push({ m: startMidi + o * 12 + w, x: (o * 7 + i) * W }));

  const blacks: { m: number; x: number }[] = [];
  for (let o = 0; o < octaves; o++)
    for (const [semi, after] of Object.entries(BLACK_AFTER))
      blacks.push({ m: startMidi + o * 12 + Number(semi), x: (o * 7 + after) * W + W - 9 });

  const fill = (m: number, black: boolean) => {
    if (activeMidi === m) return "#C9A227";
    const p = ((m % 12) + 12) % 12;
    if (p === removedPc) return "transparent";
    if (inScale.has(p)) return black ? "#C9A227" : "#F4EFE4";
    return black ? "#100E0D" : "#2A2624";
  };

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height + 4}
        role="img"
        aria-label="Keyboard showing the scale, with the removed note struck through"
      >
        {whites.map(({ m, x }) => {
          const p = ((m % 12) + 12) % 12;
          const isRem = p === removedPc;
          return (
            <g key={`w${m}`} onClick={() => onNote?.(m)} style={{ cursor: onNote ? "pointer" : "default" }}>
              <rect
                x={x + 1} y={1} width={W - 2} height={height} rx={3}
                fill={fill(m, false)}
                stroke={isRem ? "#8B1E24" : "#332E2C"}
                strokeWidth={isRem ? 3 : 1}
              />
              {isRem && (
                <text x={x + W / 2} y={height - 10} fill="#8B1E24" fontSize={16}
                      fontWeight={800} textAnchor="middle">✕</text>
              )}
            </g>
          );
        })}
        {blacks.map(({ m, x }) => {
          const p = ((m % 12) + 12) % 12;
          const isRem = p === removedPc;
          return (
            <g key={`b${m}`} onClick={() => onNote?.(m)} style={{ cursor: onNote ? "pointer" : "default" }}>
              <rect
                x={x} y={1} width={19} height={height * 0.62} rx={2}
                fill={fill(m, true)}
                stroke={isRem ? "#8B1E24" : "#000"}
                strokeWidth={isRem ? 3 : 1}
              />
              {isRem && (
                <text x={x + 9.5} y={height * 0.62 - 6} fill="#8B1E24" fontSize={13}
                      fontWeight={800} textAnchor="middle">✕</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
