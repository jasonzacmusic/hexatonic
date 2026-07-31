/**
 * The tihai generator — the resolution solver run backwards.
 *
 * A tihai is one phrase played three times, with two equal gaps, so that the
 * FINAL STROKE lands exactly on sam. The solver forward asks "how long until
 * this grouping resolves?"; the tihai asks "what gap makes three repetitions
 * resolve?" — the same clock arithmetic, inverted.
 *
 * CONVENTION (stated because there are two schools): the tihai starts ON sam
 * and its last stroke lands ON a later sam. With phrase p and gap g, in pulses,
 * the last stroke sits at index 3p + 2g − 1, so the condition is
 *     3p + 2g − 1 ≡ 0 (mod pulses-per-cycle).
 * Sanity check, the tihai every student learns first: Adi tala in 16ths is 32
 * pulses; a phrase of 11 needs gap 0 — ta din gi na tom ×3 lands dead on sam.
 */

export interface Tihai {
  phrase: number;       // pulses in the phrase
  gap: number;          // pulses of silence between repetitions (karvai)
  total: number;        // 3p + 2g
  cycles: number;       // whole tala cycles it spans
  pulsesPerCycle: number;
}

/** Smallest karvai (gap) that makes the third repetition land on sam.
 *  Returns null when no gap under two full cycles works (an odd/even dead end). */
export function solveTihai(phrase: number, pulsesPerCycle: number): Tihai | null {
  if (phrase < 1 || pulsesPerCycle < 1) return null;
  for (let gap = 0; gap <= pulsesPerCycle * 2; gap++) {
    const total = 3 * phrase + 2 * gap;
    if ((total - 1) % pulsesPerCycle === 0) {
      return { phrase, gap, total, cycles: (total - 1) / pulsesPerCycle, pulsesPerCycle };
    }
  }
  return null;
}

/** Every phrase length from 2..max that yields a tihai, shortest karvai first —
 *  the table a percussionist actually wants. */
export function tihaiTable(pulsesPerCycle: number, maxPhrase = 24): Tihai[] {
  const out: Tihai[] = [];
  for (let p = 2; p <= maxPhrase; p++) {
    const t = solveTihai(p, pulsesPerCycle);
    if (t) out.push(t);
  }
  return out;
}

/** The pulse grid for display and playback: for each pulse of the total span,
 *  which repetition sounds (1|2|3) or 0 for the gap; index total-1 is sam. */
export function tihaiGrid(t: Tihai): number[] {
  const g: number[] = [];
  for (let rep = 1; rep <= 3; rep++) {
    for (let i = 0; i < t.phrase; i++) g.push(rep);
    if (rep < 3) for (let i = 0; i < t.gap; i++) g.push(0);
  }
  return g;
}
