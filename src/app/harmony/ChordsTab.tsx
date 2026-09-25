"use client";

/**
 * Chords in the scale. Every sentence on this tab is computed from the chord
 * table for the scale on screen, in any key and any mode. Nothing here is
 * written for one mode and left standing for the others.
 */

import { useMemo, useState } from "react";
import {
  ChordSet, chordsUnderEachNote, findChords, lostTriads, stackInThirds, susQuartal, tertianOnly,
  ThirdsStack,
} from "@/lib/theory/chords";
import { midi, note, Note, notePretty, pc } from "@/lib/theory/note";
import { prettyChordSymbol } from "@/lib/theory/movement";
import { previewAudio } from "@/lib/audio/engine";
import { optionById, PROSE, ScalePicker } from "./scaleOptions";

/** Chord symbols for display: ♭ ♯ °, and the fourth stacks named in words. */
const chordName = (symbol: string) =>
  prettyChordSymbol(symbol).replace(/dim$/, "°").replace(/quartal4$/, " (4ths, 4 notes)").replace(/quartal$/, " (4ths)");
const sym = (c: ChordSet) => c.names.map((n) => chordName(n.symbol)).join(" = ");
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => COUNT[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ChordsTab() {
  const [key, setKey] = useState("G");
  const [optionId, setOptionId] = useState("d0");
  const scale = useMemo(() => optionById(optionId).build(key), [optionId, key]);
  const notes = scale.notes;

  const chords = useMemo(() => findChords(notes, [3, 4]), [notes]);
  const tri = tertianOnly(chords.filter((c) => c.size === 3));
  const tet = tertianOnly(chords.filter((c) => c.size === 4));
  const sus = susQuartal(chords);
  const twoNamed = tet.filter((c) => c.names.length > 1).length;
  const lost = useMemo(() => {
    if (!scale.removed) return [];
    const parent = [...notes, scale.removed].sort((a, b) => midi(a) - midi(b));
    return lostTriads(parent, notes);
  }, [notes, scale.removed]);
  const under = useMemo(() => chordsUnderEachNote(notes), [notes]);
  const stack = useMemo(() => stackInThirds(notes), [notes]);

  if (scale.error) return <p className="card text-amber">{scale.error}</p>;

  const triNote = scale.removed && lost.length
    ? `${cap(count(tri.length))} triads. ${list(lost.map(sym))} ${lost.length === 1 ? "is" : "are"} gone: ${
        lost.length === 1 ? "it" : "each one"} needed ${notePretty(scale.removed)}.`
    : `${cap(count(tri.length))} triads.`;
  const tetNote = `${cap(count(tet.length))} four-note chords.${
    twoNamed ? ` ${cap(count(twoNamed))} of them ${twoNamed === 1 ? "has" : "have"} two correct names: the same notes read from a different root.` : ""}`;
  const susNote = sus.length
    ? `${cap(count(sus.length))} chords built from 2nds and 4ths instead of 3rds.`
    : "None: this scale has no suspended or fourth-stacked chords.";

  return (
    <div className="space-y-5">
      <section className="card">
        <ScalePicker idPrefix="ch" keyName={key} setKey={setKey} optionId={optionId} setOption={setOptionId} />
        <p className="mt-5 font-mono text-2xl tracking-wide text-cream">{notes.map(notePretty).join("  ")}</p>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ChordColumn title="Triads" chords={tri} note={triNote} />
        <ChordColumn title="Sixths and sevenths" chords={tet} note={tetNote} />
        <ChordColumn title="Suspended and fourths" chords={sus} note={susNote} />
      </div>

      <section className="card">
        <p className="eyebrow">What goes under each note</p>
        <p className={`mt-2 ${PROSE}`}>
          Every chord made only of this scale&rsquo;s notes that contains the melody note, and the
          job the note does in it. Tap one to hear it with the melody note on top.
        </p>
        <div className="mt-4 divide-y divide-line">
          {under.map((d) => (
            <div key={pc(d.note)} className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-3">
              <span className="w-12 shrink-0 font-mono text-xl text-cream">{notePretty(d.note)}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {d.under.length === 0 && (
                  <span className="text-[15px] text-cream/75">No chord of this scale contains it.</span>
                )}
                {d.under.map((u) => (
                  <button key={u.symbol} className="chip px-3 py-1.5 text-left hover:border-cream/40"
                          onClick={() => { void previewAudio(u.voicing, 0.03); }}>
                    <span className="text-[15px] font-semibold">{chordName(u.symbol.split(" = ")[0])}</span>
                    <span className="ml-2 font-mono text-[13px] text-muted">{u.role}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Hear it as one chord</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {stack.notes.map((n, i) => (
            <div key={i} className="well min-w-[52px] rounded-lg px-3 py-2 text-center">
              <span className="block font-mono text-xl text-cream">{notePretty(n)}</span>
              {stack.degrees[i] && (
                <span className="block font-mono text-[13px] text-muted">{stack.degrees[i]}</span>
              )}
            </div>
          ))}
        </div>
        <p className={`mt-3 ${PROSE}`}>{stackLine(stack, notes, scale.removed)}</p>
        <button className="btn btn-primary mt-4"
                onClick={() => previewAudio(stack.notes.map((n) => midi(n) - (n.octave >= 6 ? 12 : 0)), 0.09)}>
          ▶ Hear it as one chord
        </button>
      </section>
    </div>
  );
}

function ChordColumn({ title, chords, note: text }: { title: string; chords: ChordSet[]; note: string }) {
  return (
    <section className="card">
      <h2 className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/80">
        {title} <span className="ml-1 text-cream">{chords.length}</span>
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {chords.map((c, i) => (
          <button key={i} className="chip text-left hover:border-cream/40"
            onClick={() => previewAudio(c.notes.map((n: Note) => midi(n)), 0.05)}>
            <span className="block text-[15px] font-semibold">{sym(c)}</span>
            <span className="block font-mono text-[13px] text-muted">{c.noteNames.map((n) => notePretty(noteOf(n))).join(" ")}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-cream/80">{text}</p>
    </section>
  );
}

const ORD: Record<string, string> = { "3": "3rd", "5": "5th", "7": "7th", "9": "9th", "11": "11th", "13": "13th" };

/** One computed sentence about the stack. */
function stackLine(stack: ThirdsStack, notes: Note[], removed: Note | null): string {
  const from = notePretty(notes[0]);
  if (!stack.degrees.length)
    return `This scale uses one letter twice, so it cannot stack purely in thirds. Stacked as close as it goes from ${from}: ${
      count(stack.thirds)} of the ${count(stack.gaps.length)} gaps are thirds.`;
  const chain = `Stacked in thirds from ${from}: ${stack.degrees.join(" ")}.`;
  if (!stack.missing.length) return `${chain} Every note is a chord tone of one chord.`;
  const gone = list(stack.missing.map((m) => `no ${ORD[m] ?? m}`));
  const why = removed && stack.missing.length === 1 ? `: that is ${notePretty(removed)}, the note this scale leaves out` : "";
  return `${chain} ${cap(gone)}${why}. Every note is still a chord tone of that one chord.`;
}

/** "F#" → a Note, only so notePretty can print ♯ and ♭. */
function noteOf(name: string): Note {
  const alt = ({ "": 0, "#": 1, "##": 2, b: -1, bb: -2 } as Record<string, number>)[name.slice(1)] ?? 0;
  return note(name[0] as Note["letter"], alt as Note["alt"], 4);
}
