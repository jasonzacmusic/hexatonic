"use client";

/**
 * The inversion ladder as TWO chords. The eight chords of a sixth–diminished
 * ladder are only two sets of four notes, each turned round four times: in G
 * major 6th diminished, G6 · G6/B · G6/D · Em7 are one chord (G B D E) and
 * A°7 · C°7 · E♭°7 · F♯°7 are the other (A C E♭ F♯).
 *
 * One panel per chord, in the ladder's two colours (cream for the tonic chord,
 * sage for the diminished, as everywhere on this tab). Each panel shows the
 * four notes once ("same four notes"), then the four names in inversion order
 * with the notes read from the bass up, the bass marked. The tile of the chord
 * sounding now turns gold, on the beat.
 */

import { previewAudio } from "@/lib/audio/engine";
import TwoChordKeys, { CHORD_A, CHORD_B } from "@/components/TwoChordKeys";
import { prettyLadder, SameNotesRung } from "@/lib/theory/barrySystem";
import { midi, notePretty } from "@/lib/theory/note";

const ORD = ["Root position", "1st inversion", "2nd inversion", "3rd inversion"];

export default function InversionFamilies({ rungs, active }: {
  rungs: SameNotesRung[];
  /** index into `rungs` of the chord sounding now, or -1 */
  active: number;
}) {
  const lit = active >= 0 ? rungs[active] : null;
  const fams = (["tonic", "dim"] as const).map((fam) => {
    const members = rungs.filter((r) => r.family === fam);
    /* one tile per inversion: the ladder's first four of this family */
    const tiles = [0, 1, 2, 3].map((k) => members.find((m) => m.inversion === k)!);
    return { fam, tiles, home: tiles[0] };
  });

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="The two chords of the ladder">
      {fams.map(({ fam, tiles, home }) => {
        const color = fam === "tonic" ? CHORD_A : CHORD_B;
        const title = `${prettyLadder(home.symbol)}: one chord, four inversions`;
        return (
          <section key={fam} className="well !p-3 sm:!p-4" style={{ borderTop: `2px solid ${color}` }}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h3 className="text-[17px] font-bold leading-tight" style={{ color }}>{title}</h3>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[13px] text-muted">same four notes</span>
                <span className="flex gap-1" aria-label={`The four notes: ${home.notes.map(notePretty).join(" ")}`}>
                  {home.notes.map((n, i) => (
                    <span key={i} className="grid h-7 min-w-[30px] place-items-center rounded-md border px-1 font-mono text-[15px] font-semibold"
                          style={{ borderColor: color, color }}>{notePretty(n)}</span>
                  ))}
                </span>
                <span className="hidden sm:block">
                  <TwoChordKeys a={fam === "tonic" ? home.notes : []} b={fam === "dim" ? home.notes : []} keyWidth={14} height={40} />
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tiles.map((t) => {
                const on = !!lit && lit.family === fam && lit.inversion === t.inversion;
                return (
                  <button key={t.inversion} type="button"
                          onClick={() => void previewAudio(t.notes.map(midi), 0.012)}
                          aria-label={`${prettyLadder(t.symbol)}: ${t.notes.map(notePretty).join(" ")}`}
                          className={`rounded-lg border px-2.5 py-2 text-left transition-colors duration-75 ${
                            on ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2 hover:border-[#4A4240]"}`}>
                    <span className="block text-[18px] font-bold leading-tight" style={on ? undefined : { color }}>
                      {prettyLadder(t.symbol)}
                    </span>
                    <span className={`block font-mono text-[13px] leading-snug ${on ? "text-[#2A2208]" : "text-cream/70"}`}>
                      {t.slash ? `= ${prettyLadder(t.slash)}` : ORD[t.inversion].toLowerCase()}
                    </span>
                    {/* the notes from the bass up, the bass boxed: the same four, turned round */}
                    <span className="mt-1.5 flex gap-1 font-mono text-[14px]">
                      {t.notes.map((n, i) => (
                        <span key={i} className={i === 0
                          ? `rounded px-1 font-bold ${on ? "bg-[#17130a] text-gold" : "bg-cream/[0.12] text-cream"}`
                          : on ? "px-0.5" : "px-0.5 text-cream/75"}>{notePretty(n)}</span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
