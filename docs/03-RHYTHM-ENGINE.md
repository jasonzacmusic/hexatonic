# SHADAVA — The Rhythm & Resolution Engine

> Jason's ask: *"we go in accents of threes, fours, fives, sixes or sevens, one
> octave or two octaves, such that a time signature is respected — we move in 4/4
> in sets of threes… until the scale resolves at the one of the next bar."*
>
> This document turns that into arithmetic. All tables verified by
> `engine/shadava_theory.py :: solve_resolution()`.

---

## 1. The two clocks

Every grouping drill is **two or three independent clocks phasing against each
other**, and the drill "resolves" when they all strike at once:

| clock | length in notes | example |
|---|---|---|
| **the bar** | `subdivision × beats_per_bar` | 4/4 in 16ths = 16 |
| **the scale** | `scale_size × octaves` | hexatonic, 1 octave = 6 |
| **the accent group** | `N` | groups of 5 = 5 |

Resolution = `LCM` of the clocks you care about, converted to bars.

## 2. Two kinds of "resolved" — the app must offer both

This distinction matters musically and nobody else's app makes it.

- **ACCENT resolution** — the accent returns to beat 1, but the scale may be
  anywhere. `LCM(group, notes_per_bar)`. Shorter, groovier, better for looping.
- **FULL resolution** — accent **and tonic** land on the downbeat together.
  `LCM(group, notes_per_bar, scale_cycle)`. This is what "resolves at the one"
  actually means to a musician, and it's what you want on camera.

```
Hexatonic, 1 octave, 4/4:

subdiv          group   accent bars   full bars   type
8ths            3       3             3           phasing
8ths            4       1             3           LOCKED
8ths            5       5             15          phasing
8ths            6       3             3           phasing
8ths            7       7             21          phasing

8th-triplets    3       1             1           LOCKED
8th-triplets    4       1             1           LOCKED
8th-triplets    5       5             5           phasing
8th-triplets    6       1             1           LOCKED
8th-triplets    7       7             7           phasing

16ths           3       3             3           phasing
16ths           4       1             3           LOCKED
16ths           5       5             15          phasing
16ths           6       3             3           phasing
16ths           7       7             21          phasing
```

**Read that carefully — it is the whole curriculum.** Groupings of 3, 4 and 6
lock immediately in triplet subdivisions. **Only 5 and 7 genuinely fight the
barline.** That gives you a natural, honest difficulty ladder instead of an
arbitrary one.

### The live-stream menu — hexatonic combos that resolve in ≤ 8 bars

| subdivision | group | bars | notes |
|---|---|---|---|
| 8th-triplets | 3 | 1 | 12 |
| 8th-triplets | 4 | 1 | 12 |
| 8th-triplets | 6 | 1 | 12 |
| sextuplets | 3 / 4 / 6 | 1 | 24 |
| 8ths | 3 / 4 / 6 | 3 | 24 |
| 16ths | 3 / 4 / 6 | 3 | 48 |
| **8th-triplets** | **5** | **5** | **60** |
| **8th-triplets** | **7** | **7** | **84** |
| sextuplets | 5 | 5 | 120 |
| sextuplets | 7 | 7 | 168 |

> **Practical note for the shoot:** groups of 5 in straight 16ths takes **15
> bars** to fully resolve — too long for camera. The same 5-grouping in
> **8th-note triplets resolves in 5 bars.** Use the triplet subdivisions for the
> odd groupings on the live stream. The app should surface this automatically by
> sorting the menu by bar count, so you never accidentally start a 21-bar drill
> on air.

---

## 3. The hexatonic advantage — the app's most defensible claim

The same table for a 7-note scale:

| grouping (16ths, 4/4, full resolution) | hexatonic | heptatonic |
|---|---|---|
| 3 | **3 bars** | 21 bars |
| 4 | **3 bars** | 7 bars |
| 5 | **15 bars** | 35 bars |
| 6 | **3 bars** | 21 bars |
| 7 | 21 bars | **7 bars** |

**In every grouping except 7 itself, the six-note scale resolves 2–7× faster.**

The reason is simple and worth saying on camera: **6 shares factors with almost
everything (2, 3), 7 shares factors with nothing.** A seven-note scale is
arithmetically hostile to grouping practice. A six-note scale is arithmetically
*friendly* to it.

> This is the single most defensible pedagogical claim the app makes, and it is
> checkable by anyone with a calculator. **The hexatonic is the correct scale on
> which to teach rhythmic grouping.** Not the major scale. That is a genuinely
> new pedagogical argument and it is the spine of the YouTube episode.

---

## 4. The Carnatic layer — this is what makes it *Jason's* app

Groupings of 3/4/5/7/9 are not a Western invention that happens to resemble
something Indian. They **are** the Carnatic **gati / nadai** system, and the
"resolve on the one" requirement **is** landing on **samam**. Using the real
vocabulary costs nothing and makes the app unmistakable.

| group | Carnatic gati | konnakol syllables |
|---|---|---|
| 3 | **Tisra** | Ta Ki Ta |
| 4 | **Chatusra** | Ta Ka Di Mi |
| 5 | **Khanda** | Ta Ka Ta Ki Ta |
| 7 | **Misra** | Ta Ki Ta Ta Ka Di Mi |
| 9 | **Sankeerna** | Ta Ka Di Mi Ta Ka Ta Ki Ta |

*(Syllable sets to be confirmed against the research briefing before shipping —
there are regional variants and this must be right.)*

Two more concepts map directly onto features:

- **Samam / eduppu** — where the phrase starts relative to the tala cycle. The
  app's "resolution" indicator *is* an eduppu display. Support starting on
  samam (beat 1) and off-samam starts as an advanced mode.
- **Yati patterns** — the traditional shapes for *sequences* of groupings.
  **Srotovaha yati** (river-flowing: 3→4→5→6→7, increasing) is **precisely what
  Jason described** when he said "accents of threes, fours, fives, or six or
  sevens." **Gopuchha yati** (cow's tail) is the decreasing mirror.
  → Ship a **"Yati Ladder"** mode that runs 3→4→5→6→7 back to back, each segment
  resolving before the next begins. That is the centrepiece of the live stream
  and it is a genuinely traditional structure, not a gimmick.

The exercise ladder itself should be modelled on the real **varisai** system —
Sarali (straight), Janta (doubled), Dhatu (leaping), Alankara (in the seven
talas) — rather than on generic Western "scale exercises." Confirm the exact
progression against the research briefing.

---

## 5. Pattern types the sequencer must generate

Given a scale, an octave range and a direction, generate:

| pattern | shape | example (C hexatonic) |
|---|---|---|
| **Aroha** | straight ascending | C D E G A B C |
| **Avaroha** | straight descending | C B A G E D C |
| **Aroha-Avaroha** | up then down | C D E G A B C B A G E D C |
| **Cells of N (run)** | consecutive, step 1 | `C D E G` / `D E G A` / `E G A B` … |
| **Cells of N (skip)** | every other degree | `C E A` / `D G B` / `E A C` … |
| **In thirds** | step 2 degrees | C E, D G, E A, G B, A C, B D |
| **In fourths** | step 3 degrees | C G, D A, E B, G C, A D, B E |
| **In fifths / sixths** | step 4 / 5 degrees | — |
| **Triad arpeggios** | the 4 available triads through the range | C – Em – G – Am |
| **Vakra (zigzag)** | non-linear degree order, e.g. 1-3-2-4-3-5 | the Carnatic *vakra* concept |

Every pattern must be generated **as a degree sequence first**, then spelled into
notes, then laid onto the rhythmic grid. Never generate notes directly — that is
how you end up unable to transpose.

**Direction handling:** descending is *not* simply the reverse array. A descending
cell-of-4 pattern in real practice is `C B A G / B A G E / A G E D`, i.e. the
cells descend *and* their contents descend. Make this an explicit option
(`reverse_cells`, `reverse_within_cell`) because teachers disagree about it and
Jason will want both.

---

## 6. Two-octave handling

The scale cycle is `scale_size × octaves`, so two octaves = 12 notes for a
hexatonic — which happens to be **maximally friendly** to 4/4 (12 = 3 × 4).
Two-octave hexatonic runs in triplets lock to the bar immediately. Worth calling
out in the UI: *"two octaves, triplets — locks every bar."*

Also decide and expose: does the top octave note repeat (`C D E G A B C`, 7
notes) or not (`C D E G A B`, 6)? **This changes every resolution calculation.**
The engine has an `include_octave_note` flag; the UI must expose it explicitly
rather than silently choosing, because the two answers are both correct and
teachers differ.

---

## 7. Implementation contract

```ts
interface DrillSpec {
  scale:        ScaleRef        // parent hexachord + mode index + tonic
  octaves:      1 | 2 | 3
  includeOctaveNote: boolean
  pattern:      PatternType     // aroha | avaroha | cells | thirds | fourths | ...
  cellLength?:  number
  cellStep?:    number
  direction:    'up' | 'down' | 'updown'
  meter:        [number, number]   // [4,4]
  subdivision:  2 | 3 | 4 | 6      // notes per beat
  grouping:     3 | 4 | 5 | 6 | 7 | 9 | null
  resolveMode:  'accent' | 'full'
  tempo:        number
}

interface DrillResult {
  notes:          Note[]        // fully spelled, octave-correct
  totalNotes:     number
  bars:           number        // MUST be an integer or the drill is invalid
  traversals:     number
  accentIndices:  number[]      // where the group accents fall
  downbeatIndices:number[]
  resolvesOn:     { bar: number; beat: number }
  gati?:          'tisra'|'chatusra'|'khanda'|'misra'|'sankeerna'
  konnakol?:      string[]
}
```

**Invariant to test:** for any valid `DrillSpec`, `bars` is a whole number and
`notes.length === totalNotes` and the final note is followed by a downbeat that
carries the tonic. If `resolveMode === 'full'`, `notes[0].pc === tonic.pc` and
the note at index `totalNotes` (i.e. the next one) would also be the tonic.
Property-test this across all combinations of the spec — it's cheap and it is
exactly the class of bug that would humiliate you live on stream.
