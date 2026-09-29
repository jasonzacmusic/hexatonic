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

---

## 28 September 2026 — spelling, degrees, symmetrical scales, credits

### Degree labels follow the spelling
Labels used to come from semitones alone, so sharped notes got flat labels
(G whole tone showed C♯ as ♭5 and D♯ as ♭6). They are now read from the
letter plus the accidental: **G whole tone = G A B C♯ D♯ F = 1 2 3 ♯4 ♯5 ♭7**,
**Prometheus = 1 2 3 ♯4 6 ♭7** in every key. One exception, for the named
six-note scales only: a white key written in place of an awkward flat (A♭
blues writes E𝄫 as D) keeps the scale's flat degree, so **the blues reads
1 ♭3 4 ♭5 5 ♭7 in every key**. Locked by `tests/degree-spelling.test.ts`,
which fails if a sharped note ever borrows a flat label from another letter.

### The augmented scale: one spelling, and its chords spelled as chords
- **Scale:** 1 ♯2 3 5 ♭6 7, one letter per note. In G that is
  **G A♯ B D E♭ F♯**, which is how Jason writes it on his board. Other keys
  follow the same pattern (C D♯ E G A♭ B); where the ♯2 would be E♯, B♯ or a
  double sharp the plain white key is written (D F F♯ A B♭ C♯).
- **Chords:** each triad is spelled as a triad, on its own letters, not
  borrowed from the scale. No single six-note spelling can hold both
  augmented triads as triads, so the chords do not always use the scale's
  letters, and that is deliberate:
  - **G+ = G B D♯** (never E♭ G B) — the scale's E♭ is the chord's D♯.
  - **B♭+ = B♭ D F♯** — named from the note just above the tonic; the
    scale's A♯ is the chord's B♭ (A♯+ would need C𝄪).
  - Major and minor chords on **G, B and E♭**, roots named as the scale
    names them (E♭m, not D♯m).
- One plain line in Pairs and Chords: "The augmented scale holds two
  augmented chords, plus major and minor chords on G, B and E♭."
- **Whole tone** holds only two chords, both augmented: **G+ = G B D♯** and
  **A+ = A C♯ E♯** (E♯ written F in the scale), each one chord seen from
  three roots (G+ = B+ = D♯+, A+ = C♯+ = F+).

### Exactly five symmetrical six-note scales
Found by trying all 924 six-note sets (`tests/symmetric.test.ts`), counted by
transposition:

| Scale | In G | Repeats every | Different ones |
|---|---|---|---|
| Whole tone | G A B C♯ D♯ F | whole step | 2 |
| Augmented | G A♯ B D E♭ F♯ | major third | 4 |
| Petrushka | G A♭ B D♭ D F | tritone | 6 |
| Messiaen mode 5 | G A♭ C C♯ D F♯ | tritone | 6 |
| No common name | G A♭ B♭ C♯ D E | tritone | 6 |

The last one is G minor + C♯ minor, Petrushka turned upside down (same Forte
class 6-30, the mirror image). It was added to the library. Messiaen mode 5
is now spelled with matching halves (G A♭ C, then C♯ D F♯).

### Credits
- **Sunday Scale** — a name made popular by Peter Martin (Open Studio). Jason
  did not coin it; the app never says he did.
- **Petrushka** — from Stravinsky's ballet *Petrushka* (1911): two major chords
  a tritone apart (in G: G major and D♭ major). Never called Bulgarian;
  Bulgarian material in the app is the odd meters (ruchenitsa and others).
- **Messiaen mode 5** — one of Olivier Messiaen's modes of limited
  transposition; it repeats every tritone.
- **Octatonic** — one of several symmetrical scales, not "the" symmetrical
  scale.
- "It's used a lot in gospel music" (the Sunday Scale) is quoted as Jason's
  words from class, not stated as a bare fact.

### No degree reads ♯1 or ♭1 (octatonics and Petrushka)
The note a semitone above the tonic is the **♭2**, never "♯1". Checked in all
twelve keys for every six- and eight-note scale by `tests/no-unison-degree.test.ts`.

- **Half–whole octatonic** now reads the dominant formula in every key,
  **1 ♭2 ♭3/♯2 3 ♯4 5 6 ♭7**: C = C D♭ E♭ E F♯ G A B♭, G = G A♭ B♭ B C♯ D E F
  (it used to be C C♯ D♯ … and G G♯ A♯ …, reading ♯1).
- **D♭ and A♭ half–whole keep their tonic.** Spelling the ♭2 on its own letter
  would need E𝄫 (B𝄫 in A♭), which is correct on paper but not how anyone
  reads a scale, so it is written as the white key: **D♭ D E F G A♭ B♭ C♭**
  and **A♭ A B C D E♭ F G♭**, both 1 ♭2 ♯2 3 ♯4 5 6 ♭7. The D (the A) reads
  **♭2**, by the same rule the blues already used: a white key standing in for
  a double flat keeps the flat degree (A♭ blues writes E𝄫 as D and keeps its ♭5).
- **Whole–half octatonic** reads 1 2 ♭3 4 ♭5/♯4 ♭6/♯5 6/𝄫7 7 in every key; D♭
  and A♭ now take F♭ and C♭ as their minor 3rd (D♭ E♭ F♭ G♭ G A B♭ C) instead
  of reading ♯2 and ♯3.
- The octatonic speller also avoids odd labels (♭4, ♯3, 𝄫6) and a letter used
  twice that is not a chromatic pair (never D♭ D♯). So B half–whole is
  B C D D♯ E♯ F♯ G♯ A — the B7 chord B D♯ F♯ A in plain sight — not
  B C D E♭ F G♭ A♭ A (♭4 𝄫6 𝄫7).
- **Petrushka** in C is now written **C D♭ E G♭ G B♭** (C + G♭, 1 ♭2 3 ♭5 5 ♭7),
  the same shape the app already used in G (G + D♭). Stravinsky wrote the chord
  as C + F♯; it is the same six sounds, and C + F♯ would read C C♯ = "♯1".
  F Petrushka is F + C♭ (F G♭ A C♭ C E♭) for the same reason. In D♭, A♭, E♭
  and B♭ the second triad keeps its natural root (D♭ + G, …) and the white key
  above the tonic reads ♭2.

### One augmented chord, one name, everywhere
The ring, the Pairs tab, the Chords tab and the Practice chord strip now name
every augmented triad the same way (`tests/aug-names-agree.test.ts`, every
six-note scale, mode and key). **E whole tone: E+ = E G♯ B♯ and G♭+ = G♭ B♭ D**
on all four (F♯+ would need C𝄪). The ring used to disagree in a few keys —
B whole tone showed C♭+ (C♭ E♭ G) where the others said G+ (G B D♯), F♯
whole tone G♭+ where the others said D+ — and now follows the same rule.

## 29 September 2026 — the sixth–diminished ladder as two chords in four inversions

Jason's request: on the sixth–diminished ladder, name each chord **from its
bass**, so the eight chords read as what they are, **two chords, each in four
inversions**. Harmony → Sixth–diminished → 4 "Inversion ladder" (deep link
`/harmony?tab=sixth&k=G&sys=major6&stage=1`; `sys` = major6, minor6,
dominant7, dominant7b5). Computed by `sameNotesLadder` in
`src/lib/theory/barrySystem.ts`, locked by `tests/inversion-ladder.test.ts`
(all four systems × twelve roots).

### The four scales (unchanged, re-checked)
Barry Harris's four sixth–diminished scales, each a chord interlocked with the
diminished 7th on its major-7th degree (sources: Alan Kingstone, *Barry Harris'
Harmonic Method* workbook; Howard Rees, *The Barry Harris Harmonic Method for
Piano*; Barry Harris workshop videos — summarised in `docs/08-JAZZ-GOSPEL.md` §1.6):

| System | In G | Tonic chord | Diminished |
|---|---|---|---|
| Major 6th diminished | G A B C D E♭ E F♯ | G6 = G B D E | A C E♭ F♯ |
| Minor 6th diminished | G A B♭ C D E♭ E F♯ | Gm6 = G B♭ D E | A C E♭ F♯ |
| Seventh diminished | G A B C D E♭ F F♯ | G7 = G B D F | A C E♭ F♯ |
| Seventh ♭5 diminished | G A B C D♭ E♭ F F♯ | G7♭5 = G B D♭ F | A C E♭ F♯ |

The dominant one has the ♭6 (E♭), not the 6: G A B C D E F F♯ is the bebop
dominant scale, not one of these.

### The ladder in G, every system
- **Major 6:** G6 · A°7 · G6/B · C°7 · G6/D · E♭°7 · **Em7** (= G6/E) · F♯°7 · G6
- **Minor 6:** Gm6 · A°7 · Gm6/B♭ · C°7 · Gm6/D · E♭°7 · **Em7♭5** (= Gm6/E, E G B♭ D) · F♯°7 · Gm6
- **Dominant 7:** G7 · A°7 · G7/B · C°7 · G7/D · E♭°7 · G7/F · F♯°7 · G7
- **7♭5:** G7♭5 · A°7 · G7♭5/B · C°7 · **D♭7♭5** (= G7♭5/D♭) · E♭°7 · G7♭5/F · F♯°7 · G7♭5

### The naming rule
1. A **diminished 7th is named from its bass** (every note of it is a root):
   A°7, C°7, E♭°7, F♯°7 are one chord, A C E♭ F♯. Its notes keep the scale's
   spelling (E♭°7 is written E♭ F♯ A C, not E♭ G♭ B𝄫 D♭), so the staff never
   needs a double flat. The first diminished on the ladder (A°7, on the 2nd
   degree) is the family's "root position"; C°7 is its 1st inversion, E♭°7 its
   2nd, F♯°7 its 3rd. (Barry names the diminished from the 7th degree, F♯°7;
   the 2nd-degree reference is Jason's, because that is where the ladder meets
   it first. Both are the same four notes.)
2. The tonic chord in root position keeps its own name (G6, Gm6, G7, G7♭5).
3. With another note in the bass: **if the four notes read as a standard
   four-note chord from that bass, that name leads and the slash name sits
   beside it** (Em7 = G6/E, Em7♭5 = Gm6/E, D♭7♭5 = G7♭5/D♭). Otherwise it is a
   slash chord (G6/B, G6/D, G7/B, G7/D, G7/F). The dominant 7th has no other
   standard name in any inversion, so all three of its inversions are slashes.
4. **Ambiguity decided:** the 7♭5 read from its ♭5 is the tritone twin
   (G7♭5 = D♭7♭5). Its letters never stack from that root, so the root takes
   the plainer name: **B7♭5, not C♭7♭5, in F; E7♭5, not F♭7♭5, in B♭**. The
   bass itself keeps the scale's letter (F7♭5/C♭). Every other reading keeps the
   scale's letter because its letters do stack (E♯m7♭5 = E♯ G♯ B D♯ in G♯ minor).

### Chords that are inversions of each other, everywhere else
Harmony → Chords (triad cards, chord trees, "Same notes, two names") and the
Practice chord strip now show a chord with more than one name as **one chord
with its other names over its bass**: **C6 = Am7/C**, **Em7 = G6/E**,
**G+ = B+/G = D♯+/G** (G whole tone), **G+ = B+/G = E♭+/G** (G augmented
scale, whose note is E♭). The lead name is still chosen by `ownSpellingFirst`
(G+ = G B D♯, B♭+ = B♭ D F♯); the other roots are named as the scale names
them, so an alias never shows a root the scale does not have. This also fixed
the chord trees, which listed "G+ = E♭+ = C♭+" in G whole tone. Locked by
`tests/same-notes.test.ts` (every scale, mode and key).
