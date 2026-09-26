/**
 * Getting a written chord to the piano without changing its shape.
 */

/** The highest note the piano samples cover well (C6). */
export const TOP_SAMPLE = 84;

/**
 * Play a stack exactly as it is written, lowest note first. If its top note
 * sits above the sampled range, the WHOLE stack moves down an octave, so the
 * notes keep their order. (Dropping only the high notes turned G B D F♯ A E,
 * stacked in thirds, into G B D F♯ A with the E an octave below the A.)
 */
export function playableStack(midis: number[]): number[] {
  if (!midis.length) return [];
  const top = Math.max(...midis);
  const shift = top > TOP_SAMPLE ? -12 * Math.ceil((top - TOP_SAMPLE) / 12) : 0;
  return midis.map((m) => m + shift);
}
