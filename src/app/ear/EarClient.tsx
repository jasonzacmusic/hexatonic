"use client";

/**
 * "Which note is missing?" — the app's thesis as an ear game.
 *
 * The whole idea of Hexatonic is a note removed from somewhere specific. So the
 * game plays a major scale with one degree silently removed, and asks WHICH.
 * No other app can pose the question, because no other app models the absence.
 *
 * Uses previewAudio (one-shot, self-limiting) rather than the sustained
 * scheduler, so it needs no transport and no lifecycle beyond the click.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { buildDiatonic, MAJOR, KEYS } from "@/lib/theory/scales";
import { Note, midi, notePretty, pc } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";

const DEGREE_NAMES: Record<number, string> = {
  2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th",
};
const DEGREES = [2, 3, 4, 5, 6, 7];

interface Round {
  key: string;
  removed: number;              // degree 2..7
  kept: Note[];                 // the six sounding notes, ascending
  full: Note[];
}

function makeRound(previousKey: string | null): Round {
  let key = KEYS[Math.floor(Math.random() * KEYS.length)];
  if (key === previousKey) key = KEYS[(KEYS.indexOf(key) + 5) % KEYS.length];
  const removed = DEGREES[Math.floor(Math.random() * DEGREES.length)];
  const full = buildDiatonic(key, MAJOR)!;
  const kept = full.filter((_, i) => i !== removed - 1);
  return { key, removed, kept, full };
}

export default function EarClient() {
  const [round, setRound] = useState<Round | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [scramble, setScramble] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });
  const [copied, setCopied] = useState(false);
  /** the exact note order last played, kept so "hear it again" replays the same */
  const orderRef = useRef<Note[]>([]);

  const playRound = useCallback((r: Round, reshuffle: boolean) => {
    let notes = [...r.kept, { ...r.kept[0], octave: r.kept[0].octave + 1 } as Note];
    if (scramble && reshuffle) {
      const inner = [...r.kept];
      for (let i = inner.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [inner[i], inner[j]] = [inner[j], inner[i]];
      }
      notes = inner;
    } else if (scramble) {
      notes = orderRef.current.length ? orderRef.current : notes;
    }
    orderRef.current = notes;
    void previewAudio(notes.map((n) => midi(n) + 12), 0.34);
  }, [scramble]);

  const next = useCallback(() => {
    const r = makeRound(round?.key ?? null);
    setRound(r);
    setAnswered(null);
    playRound(r, true);
  }, [round, playRound]);

  const answer = useCallback((deg: number) => {
    if (!round || answered !== null) return;
    setAnswered(deg);
    const right = deg === round.removed;
    setScore((s) => {
      const streak = right ? s.streak + 1 : 0;
      return {
        right: s.right + (right ? 1 : 0),
        total: s.total + 1,
        streak,
        best: Math.max(s.best, streak),
      };
    });
    // reveal by sound: the full seven-note scale, so the gap closes audibly
    void previewAudio(
      [...round.full, { ...round.full[0], octave: round.full[0].octave + 1 } as Note]
        .map((n) => midi(n) + 12), 0.22);
  }, [round, answered]);

  const share = () => {
    const pct = score.total ? Math.round((score.right / score.total) * 100) : 0;
    navigator.clipboard?.writeText(
      `🎧 Which Note Is Missing? — ${score.right}/${score.total} (${pct}%), best streak ${score.best}\n` +
      `Try it: https://hexatonic.nathanielschool.com/ear`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const reveal = answered !== null && round;
  const wasRight = reveal && answered === round!.removed;

  /* after the reveal, show the row with the removed note in its place */
  const revealRow = useMemo(() => {
    if (!round) return [];
    const rootPc = pc(round.full[0]);
    return round.full.map((n, i) => ({
      note: n,
      degree: i + 1,
      removed: i === round.removed - 1,
      rel: (((pc(n) - rootPc) % 12) + 12) % 12,
    }));
  }, [round]);

  return (
    <div className="space-y-5 pb-10">
      <header className="max-w-2xl pt-2">
        <p className="eyebrow">Ear training</p>
        <h1 className="display mt-3 text-4xl">Which note is missing?</h1>
        <p className="lede mt-4">
          Six notes of a major scale, one degree silently removed. Your ear already
          knows the scale — the game is noticing the hole. This is the whole idea of
          Hexatonic, played as a listening test.
        </p>
      </header>

      <section className="card">
        <div className="flex flex-wrap items-center gap-4">
          {!round ? (
            <button className="btn btn-primary px-8 py-3.5 text-base" onClick={next}>
              ▶ START
            </button>
          ) : (
            <>
              <button className="btn btn-primary px-6"
                      onClick={() => playRound(round, false)}>
                ▶ Hear it again
              </button>
              {answered !== null && (
                <button className="btn btn-primary px-6" onClick={next}>Next round →</button>
              )}
            </>
          )}
          <button className="btn btn-ghost" data-on={scramble}
                  onClick={() => setScramble((v) => !v)}
                  title="Scrambled order is much harder — the gap no longer sits in a rising line.">
            {scramble ? "Scrambled · hard" : "Ascending · normal"}
          </button>
          <div className="ml-auto flex items-baseline gap-6 font-mono text-sm">
            <span><b className="text-xl text-gold">{score.right}</b><span className="text-muted">/{score.total}</span></span>
            <span className="text-muted">streak <b className="text-cream">{score.streak}</b></span>
            <span className="text-muted">best <b className="text-gold">{score.best}</b></span>
          </div>
        </div>

        {round && (
          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Which degree is missing?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEGREES.map((d) => {
                const isPick = answered === d;
                const isTruth = reveal && d === round.removed;
                return (
                  <button key={d} onClick={() => answer(d)}
                    disabled={answered !== null}
                    className={`min-w-[72px] rounded-xl border px-5 py-3 text-xl font-bold transition ${
                      isTruth ? "border-gold bg-gold text-[#17130a]"
                      : isPick ? "border-red bg-red/15 text-red-hi"
                      : "border-line bg-surface2 hover:border-gold/60 disabled:opacity-50"}`}>
                    {DEGREE_NAMES[d]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {reveal && (
          <div className="mt-6 border-t border-line pt-5">
            <p className={`text-lg font-bold ${wasRight ? "text-gold" : "text-red-hi"}`}>
              {wasRight ? "Yes — " : "It was "}the {DEGREE_NAMES[round!.removed]}
              {" "}— {notePretty(round!.full[round!.removed - 1])} in {round!.key} major.
              {wasRight ? "" : ` You said the ${DEGREE_NAMES[answered!]}.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {revealRow.map((item) => (
                <span key={item.degree}
                  className={`rounded-lg border px-4 py-2 text-xl font-semibold ${
                    item.removed
                      ? "border-2 border-dashed border-red/70 bg-red/[0.07] text-red-hi"
                      : "border-line bg-surface2"}`}>
                  {notePretty(item.note)}
                  <span className="ml-1.5 align-top font-mono text-[9px] text-muted">{item.degree}</span>
                </span>
              ))}
            </div>
            <p className="quiet mt-3">
              The reveal you just heard is the complete scale — listen for the gap closing.
            </p>
          </div>
        )}
      </section>

      <section className="card max-w-3xl">
        <p className="eyebrow">How to get good at this</p>
        <p className="mt-3 text-[15px] leading-relaxed text-cream/80">
          Sing up the scale with the sound. Where your voice wants a note the piano skips,
          that is the hole. The 4th and the 7th are the easiest to spot — they are the two
          notes that give the major scale its pull, which is exactly why removing them makes
          the smoothest hexatonics. The 6th is the sneakiest. Score above 80% in ascending
          order, then switch to scrambled.
        </p>
        {score.total > 0 && (
          <button className="btn btn-ghost mt-4" onClick={share}>
            {copied ? "✓ Copied" : "Copy my score for WhatsApp"}
          </button>
        )}
      </section>
    </div>
  );
}
