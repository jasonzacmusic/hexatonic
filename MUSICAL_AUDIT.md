# MUSICAL_AUDIT.md — Hexatonic

**Audited:** 3 August 2026 · **Live at:** hexatonic.nathanielschool.com

**No musical defect found. No source file changed.**

`npm test` — **189 tests, all passing** (177 existing + 12 new).

---

## Why nothing changed

This repo already carries one of the strongest theory suites in the portfolio,
and it proves its claims rather than asserting them — the tritone-free
hexachord count is checked by enumerating all 924 six-note subsets, and the
raga list is sourced to `docs/07-CARNATIC.md` with the research errors it
corrected written down in the source.

Claims re-derived by hand during this audit, all correct:

| Claim | Verdict |
|---|---|
| The diatonic hexachord is 6-32 with vector ⟨143250⟩ and zero tritones | correct |
| Exactly five hexachord set classes are tritone-free | correct |
| 6-32 is the unique hexachord with the most perfect fourths | correct |
| Minor and major blues are the same set class, a minor third apart | correct |
| The augmented hexatonic holds 3 major and 3 minor triads and no dominant 7th | correct |
| Whole tone has two transpositions, the octatonics three | correct |
| Pushpalathika is the minor hexatonic — dhaivata-varjya, janya of mela 22 | correct, and sourced |
| Sriranjani is panchama-varjya, **not** the minor hexatonic | correct — the source records this as a research correction |
| The "gospel scale" means 1 2 ♭3 3 5 6, not the diatonic hexachord | correct, and the naming note in `scales.ts` is right to insist on it |

The Carnatic swara table is also read from **semitone distance above Sa**, not
from a note's index in the scale — the failure mode that had to be fixed in
Fifth-Harmony. Hexatonic already did it right.

---

## What was added

`tests/every-scale.test.ts` — 12 tests, the brute-force sweep the existing
suite did not have: **every family × every mode × all twelve keys.**

- Every scale **builds without error** and returns the number of notes its
  family declares.
- **No scale ever needs a triple accidental**, in any key.
- Every scale **ascends**, sounds each pitch once, and stays inside an octave.
- Every scale **starts on the key it was asked for.**
- **Letters repeat only where the music asks.** A letter may carry two notes —
  the blues scale is C E♭ F **G♭ G** B♭, and an eight-note scale cannot avoid a
  repeat — but never three, and a repeat must be either a chromatic pair a
  semitone apart or the root's letter taken again at the top, which is how
  A B C D E♭ F G♭ A♭ is conventionally written.
- **The degree labels shown are the degrees sounding**, recomputed from
  semitone distance.
- **Transposing a scale transposes every note by the same distance** — the same
  shape in all twelve keys, checked against the C form.
- **The set-class facts a scale reports are the facts of its own notes**: the
  interval vector accounts for every pair, the advertised tritone count is that
  vector's tritone entry, and the prime form starts at 0.
- **The diatonic hexachord has no tritone in any key or rotation**, and its
  seven-note parent has exactly one — the interval the removed note carried.
- **Each mode's `hasThird` and `hasFifth` flags match its actual notes.**
- **An unreachable mode index or an unknown family falls back** rather than
  throwing.
