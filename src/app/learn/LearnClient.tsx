"use client";

/**
 * The five theorems, each with an AUDIBLE proof. A claim you can hear is worth
 * more than a claim you can read.
 */

import { useState } from "react";
import { omissionSurvey, buildScale, buildDiatonic, MAJOR, DIATONIC_MODES } from "@/lib/theory/scales";
import { skipCycle } from "@/lib/theory/patterns";
import { findChords, tertianOnly } from "@/lib/theory/chords";
import { solveResolution } from "@/lib/theory/resolution";
import { midi, noteName, notePretty, Note } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";
import Keyboard from "@/components/Keyboard";

function PlayLine({ notes, label, gap = 0.26 }: { notes: Note[]; label: string; gap?: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost text-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const played = await previewAudio(notes.map((n) => midi(n)), gap);
        if (played) setTimeout(() => setBusy(false), notes.length * gap * 1000 + 300);
        else setBusy(false);
      }}
    >
      ▶ {label}
    </button>
  );
}

function Card({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Theorem {n}</p>
      <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function LearnClient() {
  const rows = omissionSurvey("C");
  const cMajNo4 = buildScale("C", "diatonic", 0);
  const cMin = buildScale("C", "diatonic", 4);
  const cMajor = buildDiatonic("C", MAJOR)!;
  const hexaFourths = skipCycle(cMajNo4.notes, 3);
  const heptFourths = skipCycle(cMajor, 3);
  const hexaThirds = skipCycle(cMajNo4.notes, 2);
  const triads = tertianOnly(findChords(cMajNo4.notes, [3]));
  const tetrads = tertianOnly(findChords(cMajNo4.notes, [4]));

  const flat = (c: ReturnType<typeof skipCycle>) => c.pairs.flatMap((p) => [p.from, p.to]);

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-2xl pt-2">
        <h1 className="text-3xl font-extrabold">The five theorems</h1>
        <p className="lede mt-3">
          Every claim here was computed and then checked against an independent
          implementation. Each one has a button, because a claim you can hear beats
          a claim you can read.
        </p>
      </header>

      <Card n={1} title="Only the 4th and the 7th can go">
        <p className="text-muted">
          The major scale contains exactly one tritone: F–B. Remove either member of it —
          and only those two — and that tritone is gone. Every other removal keeps it.
          This does not mean every remaining interval is consonant in every musical context.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full max-w-xl text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.removedDegree}
                    className={`border-b border-line/60 ${r.tritones === 0 ? "text-gold" : "text-muted"}`}>
                  <td className="py-1.5 pr-4 font-semibold">−{r.removedNote}</td>
                  <td className="py-1.5 pr-4 font-mono">{r.notes.join(" ")}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{r.tritones} tritone{r.tritones === 1 ? "" : "s"}</td>
                  <td className="py-1.5 font-mono text-[10px]">{r.forte.split("·")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlayLine notes={[cMajor[3], cMajor[6]]} label="hear the tritone (F–B)" gap={0.5} />
          <PlayLine notes={cMajor} label="the 7-note scale" gap={0.2} />
          <PlayLine notes={cMajNo4.notes} label="the 6-note scale" gap={0.2} />
        </div>
      </Card>

      <Card n={2} title="Your major and minor hexatonics are the same six notes">
        <p className="text-muted">
          C major without its 4th, A minor without its ♭6, and the hexachord Guido
          d&rsquo;Arezzo taught sight-singing with are one pitch-class set in three
          rotations. So the app stores one scale and rotates it — never two.
        </p>
        <div className="grid gap-2 font-mono text-sm sm:grid-cols-3">
          <div className="chip text-left">C major, no 4th<br /><span className="text-gold">C D E G A B</span></div>
          <div className="chip text-left">A minor, no ♭6<br /><span className="text-gold">A B C D E G</span></div>
          <div className="chip text-left">Guidonian on G<br /><span className="text-gold">G A B C D E</span></div>
        </div>
        <p className="text-sm text-muted">
          One caution worth keeping: do not say music had six notes before it had seven.
          The seven letters came first and underlie the hexachord — the six syllables were
          a way of learning to sing, not a claim about how many notes existed.
        </p>
        <div className="flex flex-wrap gap-3">
          {DIATONIC_MODES.map((m) => {
            const s = buildScale(["C", "D", "E", "G", "A", "B"][m.index], "diatonic", m.index);
            return (
              <div key={m.index} className="rounded-lg border border-line bg-surface2 p-3">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="font-mono text-[11px] text-gold">{s.notes.map(notePretty).join(" ")}</p>
                <p className="font-mono text-[10px] text-muted">{m.degrees}</p>
                <div className="mt-2"><PlayLine notes={s.notes} label="hear it" gap={0.2} /></div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card n={3} title="The scale is a chord">
        <p className="text-muted">
          Stack all six notes in thirds and every scale note is accounted for. From C you get maj13
          without the 11th; from A you get m11. Every note is a chord tone — because the
          note that wasn&rsquo;t is the one we removed.
        </p>
        <div className="flex flex-wrap gap-2">
          <PlayLine notes={[0, 2, 4, 6, 1, 5].map((i) => cMajNo4.notes[i])} label="C E G B D A — Cmaj13" gap={0.12} />
          <PlayLine notes={cMajNo4.notes} label="the scale" gap={0.18} />
        </div>
        <p className="text-sm text-muted">
          A caveat the honest version needs: the &ldquo;avoid note&rdquo; idea is about
          <em> harmony</em> — the 4th is kept out of voicings and long notes, not banned
          from being played at all. And over a minor chord, whether the ♭6 counts as an
          avoid note is genuinely disputed. The tritone argument above does not depend on
          any of that, which is why it leads.
        </p>
      </Card>

      <Card n={4} title="The harmony is tiny, and that is the feature">
        <p className="text-muted">
          Four triads. Three four-note sets, two of which carry a second, equally correct
          name. There is no D minor and no B diminished, because both needed the F.
        </p>
        <div className="flex flex-wrap gap-2">
          {triads.map((c, i) => (
            <button key={i} className="chip hover:border-gold"
                    onClick={() => { void previewAudio(c.notes.map((n) => midi(n)), 0.05); }}>
              <span className="font-semibold">{c.names[0].symbol}</span>
              <span className="block font-mono text-[10px] text-muted">{c.noteNames.join(" ")}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tetrads.map((c, i) => (
            <button key={i} className="chip hover:border-gold"
                    onClick={() => { void previewAudio(c.notes.map((n) => midi(n)), 0.05); }}>
              <span className="font-semibold">{c.names.map((n) => n.symbol).join(" = ")}</span>
              <span className="block font-mono text-[10px] text-muted">{c.noteNames.join(" ")}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card n={5} title="You cannot practise it in thirds">
        <p className="text-muted">
          Step two degrees through a six-note scale and you do not get thirds. You get two
          major thirds, two minor thirds and two perfect fourths — the fourths appearing
          exactly where the removed note left a gap.
        </p>
        <p className="font-mono text-sm text-gold">
          {hexaThirds.pairs.map((p) => `${noteName(p.from)}–${noteName(p.to)} (${p.interval})`).join("   ")}
        </p>
        <PlayLine notes={flat(hexaThirds)} label="hear it in thirds" gap={0.17} />

        <hr className="border-line" />
        <p className="text-muted">
          Now step <strong className="text-cream">three</strong> degrees. Every single one
          is a perfect fourth or a perfect fifth. Six for six. The seven-note scale cannot
          do this — F–B comes out an augmented fourth and breaks the chain, and the note
          that breaks it is the note we removed.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gold/40 bg-gold/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold">six notes</p>
            <p className="mt-1 font-mono text-sm">
              {hexaFourths.pairs.map((p) => `${noteName(p.from)}–${noteName(p.to)} (${p.interval})`).join("  ")}
            </p>
            <div className="mt-2"><PlayLine notes={flat(hexaFourths)} label="hear it" gap={0.2} /></div>
          </div>
          <div className="rounded-lg border border-amber/40 bg-amber/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-amber">seven notes</p>
            <p className="mt-1 font-mono text-sm">
              {heptFourths.pairs.map((p) => (
                <span key={noteName(p.from)} className={p.interval === "A4" ? "text-amber" : ""}>
                  {noteName(p.from)}–{noteName(p.to)} ({p.interval}){"  "}
                </span>
              ))}
            </p>
            <div className="mt-2"><PlayLine notes={flat(heptFourths)} label="hear the flaw" gap={0.2} /></div>
          </div>
        </div>
      </Card>

      <section className="card">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">And the consequence</p>
        <h2 className="mt-2 text-2xl font-extrabold">Six resolves faster than seven</h2>
        <p className="mt-3 text-muted">
          Group the scale in fives against 4/4 and the accent phases against the barline.
          The phrase resolves when the tonic and the accent land on a downbeat together.
        </p>
        <div className="mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
          <div className="chip text-left">
            <span className="font-mono text-[10px] uppercase text-muted">six notes, 5s, 16ths</span>
            <span className="block text-2xl font-extrabold text-gold">
              {solveResolution(6, 4, 4, 5, "full").bars} bars
            </span>
          </div>
          <div className="chip text-left">
            <span className="font-mono text-[10px] uppercase text-muted">seven notes, 5s, 16ths</span>
            <span className="block text-2xl font-extrabold text-muted">
              {solveResolution(7, 4, 4, 5, "full").bars} bars
            </span>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Six shares factors with almost everything. Seven shares factors with nothing.
          That is the whole reason a six-note scale is the right one to teach grouping on —
          and the reason a room full of players can land a cycle together.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-extrabold">What was removed</h2>
        <p className="mt-2 text-sm text-muted">
          The concept is subtractive, so the app draws the absence. Red is the note that
          is gone; gold is the note sounding; cream is the rest of the scale.
        </p>
        <div className="mt-4"><Keyboard scale={cMajNo4.notes} removed={cMajNo4.removed} /></div>
        <div className="mt-4"><Keyboard scale={cMin.notes} removed={cMin.removed} /></div>
      </section>
    </div>
  );
}
