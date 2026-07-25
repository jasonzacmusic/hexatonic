# SHADAVA — Application Specification

**Working name:** SHADAVA (षाडव) — the Carnatic classification for a six-note raga.
Roadmap siblings already named by the tradition: **Audava** (5), **Sampurna** (7).

**Positioning:** *the only free, browser-based app built entirely around hexatonic
practice.* **Do not claim "world's first"** — it is false and easily rebutted; see
`docs/06-PRIOR-ART.md` for the two products that defeat it and the claims that
survive scrutiny instead.

The genuine, verified moat is the **resolution solver + Carnatic grouping ladder**:
no generator of melodic groupings against a tala exists in any market.

**Live URL target:** `hexatonic.nathanielschool.com` (or `shadava.nathanielschool.com`)

---

## 1. Stack — match the house pattern exactly

Follow the pattern already proven in **gradus**, **melakarta-sphere**,
**rhythm-arithmetic** and **chord-randomiser**:

| layer | choice |
|---|---|
| framework | **Next.js (App Router) + React + TypeScript**, deployed to Vercel |
| notation | **VexFlow 5** (Bravura + Academico, self-hosted fonts) |
| audio | **Web Audio API** with a real sampled piano; Salamander Grand SF2-derived samples where weight permits, else a well-voiced sample set. Scheduling via `AudioContext.currentTime`, never `setTimeout`. |
| state | React state + URL query params (every drill must be a shareable link) |
| persistence | `localStorage` for streaks/progress; no backend for v1 |
| styling | Tailwind, dark-first, matching the NSM palette |
| tests | **Vitest** — the theory engine is unit-tested against `engine/verified.json` |

**No database for v1.** No auth. It must load instantly and work offline after
first visit (PWA manifest + service worker, as in nakshatra/maatu).

---

## 2. The non-negotiables (these are the house rules)

### 2.1 Music theory correctness
- A note is `{ letter, alt, octave }`. **Never a bare MIDI integer.** Ever.
- Build the **parent 7-note scale first** with one letter per degree, then remove
  the omitted degree. Never remove-then-respell.
- All 12 keys must spell correctly with **no repeated letters and no triple
  accidentals**. The verified table is in `docs/01-THEORY.md §8`; make it a test.
- Key signatures come from the spelling engine; an accidental is drawn **only**
  where the pitch departs from the signature.
- A chord is a **pitch-class set with a list of names**, never one root + one
  quality. `Am7` and `C6` are one object with two readings.
- One parent hexachord + a mode index. **Never** separate "major hexatonic" and
  "minor hexatonic" scale objects — see `docs/01-THEORY.md §2`.

### 2.2 VexFlow engraving — the checklist, verbatim
These are permanent house rules; violating any one of them reads as amateur
engraving to a musician instantly.

1. **NEVER hand-build beams.** Use
   `VF.Beam.generateBeams(barNotes, { groups: [new VF.Fraction(1,4)], maintain_stem_directions: false })`
   per bar. Call it after creating notes, **before** `Formatter.format`; draw
   beams after `voice.draw`.
2. Cut every note at bar boundaries and **tie** the fragments (`VF.StaveTie`).
   Never let a duration cross a barline.
3. Duration map on a sixteenth grid: `1=16, 2=8, 3=8d, 4=q, 6=qd, 8=h, 12=hd,
   16=w`; other values greedy-split with ties. Dots via
   `VF.Dot.buildAndAttach([note], { all: true })`.
4. One measure-group per stave line; internal barlines via `new VF.BarNote()`
   pushed between bars in the tickables list.
5. `voice.setStrict(false)`; `num_beats` = beats in the line.
6. Live highlight **without re-render**: `svg g.vf-stavenote` groups appear in
   document order matching tickable creation order — set fill/stroke on the
   group element directly. (`BarNote` emits no `vf-stavenote` group, so
   document-order mapping stays aligned.)
7. **Nothing renders before** `document.fonts.load("30pt Bravura")` and
   `"30pt Academico"` resolve.

**And the three traps that cost real debugging time in GRADUS:**

8. **A stave's `y` is the top of its BOX, not its top line** (~4 line-spaces of
   headroom). Build the staves, then ask `getYForLine(0)` / `getYForLine(4)`
   where the lines actually landed, and size the page from the answer.
9. **VexFlow sizes its root SVG with an inline style in absolute pixels.** Fix in
   CSS with `width: 100% !important; height: auto !important` — the one place
   `!important` earns its keep. Otherwise percentage-positioned overlays drift
   sideways from the notes they label.
10. **`width:100%` blows up SHORT scores.** Cap the **frame** (not the SVG)
    against the engraving's natural width, e.g. `maxWidth: naturalWidth * 1.15`.

Reference implementation to read before writing a line of notation code:
`melakarta-sphere/components/KritiScore.tsx`, plus
`rhythm-arithmetic/NOTATION_STANDARD.md`.

### 2.3 Audio
**Do not build a sampler from scratch and do not go looking for samples.**
A working, web-ready Salamander Grand Piano set already exists on this Mac:

```
~/Documents/Claude/melakarta-sphere/public/audio/salamander/   17 × mp3, 1.2 MB
~/Documents/Claude/melakarta-sphere/lib/audio.ts               the loader
```

17 samples (A2–A5, C2–C5, etc.) with pitch-shifting between sample points — a
proven, small, fast setup already shipped in melakarta-sphere, sight-singing-studio
and the-virus. **Copy both the folder and the loader**, then extend the loader
with the scheduling and highlight-sync this app needs.

- Real piano samples. A sine wave will destroy credibility instantly on a channel
  about musicianship.
- Onsets must be **frame-accurate** against the notation highlight.
- Handle the AudioContext suspend/resume trap (see rhythm-arithmetic): resume on
  first user gesture, and re-resume after tab-visibility changes.
- Metronome/click as a separate gain node so it can be muted independently.
- Count-in of one bar minimum before any drill.

---

## 3. Information architecture

```
/                     Landing: the thesis, one animated proof, "Start practising"
/learn                The theory, taught in order (the 5 theorems as cards)
/practice             THE CORE. The drill machine.
/scales               The library — every hexatonic family, all 12 keys, 6 modes
/harmony              The available-chords explorer (4 triads, 3 tetrads, quartals)
/resolution           The resolution calculator / grid (a standalone useful tool)
/live                 Presenter mode for the YouTube shoot
/about
```

### 3.1 `/practice` — the core screen

Layout, desktop-first (this is used at a piano with a big screen):

```
┌──────────────────────────────────────────────────────────────┐
│  KEY [C ▾]   MODE [Ionian Hexatonic ▾]   FAMILY [Diatonic ▾] │
├──────────────────────────────────────────────────────────────┤
│  PATTERN  [Aroha-Avaroha ▾]   OCTAVES [1|2|3]                │
│  GROUPING [3|4|5|6|7|9]  SUBDIV [8|trip|16|sext]  ○accent ●full│
│  TEMPO ────●────── 84   [▶ PLAY]  [◼]  [LOOP]                │
├──────────────────────────────────────────────────────────────┤
│  ⚑ RESOLVES IN 5 BARS  ·  60 notes  ·  10 traversals         │
│     khanda gati · Ta Ka Ta Ki Ta                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [ VEXFLOW NOTATION — full drill, accents marked,           │
│     current note highlighted, barlines and ties correct ]    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│   [ KEYBOARD / FRETBOARD — scale degrees lit, removed note   │
│     shown as a GHOST so students see what was knocked off ]  │
└──────────────────────────────────────────────────────────────┘
```

**Critical UI ideas, in priority order:**

1. **The Resolution Banner.** Always visible, always live: *"resolves in 5 bars ·
   60 notes."* If a combination would take 21 bars, say so in amber **before**
   they press play. This single element is what makes the app feel intelligent.
2. **The ghost note.** On the keyboard and on the staff, show the *removed* note
   greyed out. The whole concept of the app is subtractive; make the subtraction
   visible. This is the screenshot that sells the app.
3. **Accent marks that are real.** Group accents drawn as actual articulation
   marks on the notation, not coloured blobs.
4. **The "two names" chord flip.** Anywhere a chord is labelled, tapping it
   cycles the readings (`Am7 ⇄ C6`). Teaching by interaction.
5. **URL state.** Every configuration is a link. Jason will paste drill links
   into WhatsApp and YouTube descriptions. This is non-optional.

### 3.2 `/live` — presenter mode

Built for a YouTube live shoot, not for a student.

- **Huge type**, readable from the piano bench at 3 m.
- **Preset chips** in the order they'll be taught: one tap = load the drill.
- **A visible countdown to the resolution bar** so viewers can feel it landing.
- **No mouse-hunting:** keyboard shortcuts for everything —
  `space` play/stop, `1-7` grouping, `↑↓` key, `←→` mode, `L` loop, `T` tempo.
- **Big "RESOLVES ON BAR n" flash** when it lands. This is the payoff moment and
  it needs to be visually unmissable on camera.
- Nothing that can produce a dialog, toast, or layout shift mid-take.
- **Offline-safe.** If the venue wifi drops, the shoot continues.

### 3.3 `/resolution` — a standalone calculator

The grid from `docs/03-RHYTHM-ENGINE.md`, interactive: pick scale size,
subdivision, meter and octaves; get every grouping's bar count. Genuinely useful
to any musician regardless of scale, so it will earn links and shares on its own.
This is the app's SEO trojan horse.

---

## 4. Data model

```ts
type Letter = 'C'|'D'|'E'|'F'|'G'|'A'|'B'

interface Note { letter: Letter; alt: -2|-1|0|1|2; octave: number }

interface Hexachord {
  id: string                 // 'diatonic' | 'augmented' | 'wholetone' | 'blues' | ...
  name: string
  parentScale?: number[]     // semitones of the 7-note parent, if derived
  omittedDegree?: number     // 1-indexed, if derived by omission
  steps: number[]            // 6 semitone steps, summing to 12
  modes: ModeDef[]           // 6 rotations, each named
  primeForm: number[]
  intervalVector: number[]
  tritoneCount: number
}

interface ModeDef {
  index: number              // 0..5
  name: string               // 'Ionian Hexatonic', 'Minor Hexatonic', ...
  aka: string[]              // 'Sunday scale', 'gospel', 'Guidonian', ...
  degrees: string[]          // ['1','2','3','5','6','7']
  hasThird: boolean
  hasFifth: boolean
  teachingNote: string       // the one-liner the app shows
}

interface ScaleInstance {         // a Hexachord + mode + tonic = actual notes
  hexachord: Hexachord
  modeIndex: number
  tonic: Note
  notes: Note[]                   // spelled, ascending, one octave
}

interface ChordSet {              // NOT root+quality. A SET with names.
  pcs: number[]
  notes: Note[]
  names: { symbol: string; root: Note; family: 'tertian'|'sus'|'quartal' }[]
}
```

**The scale library** ships as data, generated by porting the Python engine.
Minimum v1 content:

| family | why it's in v1 |
|---|---|
| **Diatonic hexachord** (6 modes × 12 keys) | the core product |
| Mixolydian hexatonic (no 4) | the dominant-7th / blues-rock colour |
| Blues hexatonic | Jason's audience expects it |
| Augmented hexatonic | the jazz "hexatonic scale"; 3 maj + 3 min triads |
| Whole tone | completeness, and it's the famous one |

v2: Prometheus, Petrushka, harmonic-minor hexatonics, triad-pair generator.

---

## 5. Build order (ship in this sequence)

**Milestone 1 — the engine, headless and tested.**
Port `engine/shadava_theory.py` to TypeScript. Unit-test against
`engine/verified.json`: the omission survey, the six modes, the chord sets, the
four skip cycles, the 12-key spelling table, and the resolution grid. **Nothing
visual until these pass.** This is where correctness is won or lost.

**Milestone 2 — notation.** Render an arbitrary drill correctly in all 12 keys,
with the full VexFlow checklist honoured. Verify by eye against `/learn`
examples in at least C, F#, Db and Eb.

**Milestone 3 — audio + highlight.** Sampled piano, frame-accurate highlight,
count-in, metronome, loop.

**Milestone 4 — `/practice`.** All controls live, resolution banner, ghost note,
URL state.

**Milestone 5 — `/learn` and `/scales`.** The five theorems as interactive cards,
each with an audible A/B ("here's the heptatonic in fourths — hear the augmented
4th; here's the hexatonic — all perfect").

**Milestone 6 — `/live` presenter mode + `/resolution` calculator.**

**Milestone 7 — ship.** SEO/OG/favicon/JSON-LD, live-deploy verification, then
main. Per house rule: a **preview URL first**, main only after Jason approves.

---

## 6. Content that must be written (not just coded)

The app is a teaching instrument; the prose is half the product.

- **The five theorems** as `/learn` cards, in the order they appear in
  `docs/01-THEORY.md`. Each needs: the claim, the audible proof, and one sentence
  of "so what does this get me."
- **Per-mode teaching notes.** Especially the two good ones: mode 2 has no third
  (quartal), mode 5 is Dorian/Aeolian-ambiguous (works over m7 *and* m6).
- **"Where you've heard this."** Gospel/Sunday-morning for the Ionian hexatonic;
  folk/bluegrass for the Guidonian; the augmented hexatonic for Coltrane-era
  jazz. Cite actual repertoire — vague claims will be caught.
- **The Guido d'Arezzo history.** "Before Western music had seven notes, it had
  six." One paragraph, sourced.

---

## 7. Explicit non-goals for v1

- No pitch detection / no microphone. (Sight Singing Studio already does that;
  don't rebuild it here.)
- No MIDI input in v1 — but leave the seam open, because MIDI-in is the obvious
  v2 (grade the student's played run against the drill).
- No user accounts, no cloud sync, no social features.
- No guitar tab in v1. Fretboard *display* yes; tab notation no.
- Don't attempt the Barry Harris module in v1. It is a harmony engine, not a
  scale, and it deserves to be done properly rather than bolted on.
