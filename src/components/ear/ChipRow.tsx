"use client";

/**
 * One row of the reveal: the notes (or the counts) of your pick or of the
 * answer. Gold lights the chip that is sounding now and nothing else. Red is
 * only ever the missing note: dashed at rest, filled while it sounds back in.
 * No transition INTO the lit state, so exactly one chip is lit at a time.
 */

import type { Row } from "@/lib/ear/games";

export default function ChipRow({ row, lit }: { row: Row; lit: number[] | null }) {
  const on = new Set(lit ?? []);
  const rhythm = row.kind === "rhythm";
  return (
    <div>
      <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/70">{row.title}</p>
      {/* Note rows: one line on a phone too, as equal columns; rhythm rows wrap
          between groups. */}
      <div className={rhythm ? "mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5" : "mt-2.5 grid gap-1.5 sm:flex sm:gap-2"}
           style={rhythm ? undefined : {
             gridTemplateColumns: `repeat(${row.chips.length}, minmax(0, 1fr))`,
             maxWidth: `${row.chips.length * 64}px`,
           }}>
        {groups(row).map((idx, gi) => (
          <span key={gi} className={rhythm ? "flex gap-1.5" : "contents"}>
        {idx.map((i) => {
          const c = row.chips[i];
          const sounding = on.has(i);
          const removed = c.state === "removed";
          const absent = c.state === "absent";
          const base = rhythm
            ? `flex h-11 min-w-[36px] flex-col items-center justify-center rounded-lg border px-2 font-mono ${
                c.accent ? "text-[17px] font-bold" : "text-[14px]"}`
            : "flex min-w-0 flex-col items-center rounded-xl border px-1 pb-1.5 pt-2 sm:min-w-[58px] sm:px-3";
          const look =
            removed && sounding ? "border-red bg-red/25 text-red-hi"
            : removed ? "border-2 border-dashed border-red/80 bg-red/[0.06] text-red-hi"
            : sounding ? "chip-lit"
            : absent ? "border-dashed border-line-control text-muted"
            : c.accent ? "border-cream/60 bg-surface2 text-cream"
            : "border-line bg-surface2 text-cream/90";
          return (
            <span key={i} className={`${base} ${look} ${sounding ? "" : "transition-[background-color,border-color,color] duration-[60ms]"}`}>
              {rhythm ? (
                <>
                  <span aria-hidden className={`text-[13px] leading-none ${c.accent ? "" : "opacity-0"}`}>&gt;</span>
                  <span className="leading-tight">{c.label}</span>
                </>
              ) : (
                <>
                  <span className="text-[18px] font-semibold leading-tight sm:text-[20px]">{c.label}</span>
                  <span className={`font-mono text-[13px] leading-tight ${sounding && !removed ? "text-[#2A2208]" : removed ? "" : "text-muted"}`}>
                    {absent ? "out" : c.sub}
                  </span>
                  {c.state === "tell" && (
                    <span aria-label="the tell" className={`mt-1 h-[2px] w-5 rounded-full ${sounding ? "bg-[#2A2208]" : "bg-cream/80"}`} />
                  )}
                </>
              )}
            </span>
          );
        })}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rhythm rows break between groups, never inside one; note rows are one run. */
function groups(row: Row): number[][] {
  const all = row.chips.map((_, i) => i);
  if (row.kind !== "rhythm") return [all];
  const out: number[][] = [];
  for (const i of all) {
    if (row.chips[i].accent || !out.length) out.push([]);
    out[out.length - 1].push(i);
  }
  return out;
}
