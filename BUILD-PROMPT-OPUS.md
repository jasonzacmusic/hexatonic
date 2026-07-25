# SHADAVA — the build prompt

Two blocks below. **Block A** is the one to paste for the real build (Opus, in
Claude Code, in this repo). **Block B** is a shorter variant if you want to hand
just the theory-engine port to Codex first.

---

## BLOCK A — paste this to Opus / Claude Code

```
Build SHADAVA, a hexatonic-scale practice web app, in this repo:
/Users/jasonzac/Documents/Claude/shadava

READ THESE FIRST, IN THIS ORDER, BEFORE WRITING ANY CODE:
  docs/01-THEORY.md        the verified music theory — this is the source of truth
  docs/02-APP-SPEC.md      stack, data model, screens, build order, house rules
  docs/03-RHYTHM-ENGINE.md the grouping / resolution system
  docs/06-PRIOR-ART.md     what we may and may not claim in copy
  docs/07-CARNATIC.md      VERIFIED raga names, gati, konnakol, varisai ladder --
                           and a list of things marked UNVERIFIED that must NOT be
                           stated as fact anywhere in the UI
  docs/08-JAZZ-GOSPEL.md   VERIFIED Western/jazz theory + SIX CORRECTIONS to earlier
                           drafts. Read section 1 before writing ANY user-facing copy.
  engine/shadava_theory.py the working reference implementation
  engine/VERIFIED-OUTPUT.txt  its verified output — these ARE the tests
  engine/verified.json     machine-readable form of the same truth tables

Also read, before writing any notation code:
  ../melakarta-sphere/components/KritiScore.tsx      (VexFlow reference impl)
  ../rhythm-arithmetic/NOTATION_STANDARD.md          (notation standard)

WHAT THIS IS
A practice tool for six-note scales. Multi-key, multi-mode, multi-scale, with
generated pattern drills in groupings of 3/4/5/6/7 that resolve on the downbeat,
live VexFlow notation, and real sampled-piano playback. Built for Jason Zac to
use live on a YouTube stream with students playing along.

THE CORE THESIS (state it in the UI, it is proven in docs/01-THEORY.md)
A hexatonic scale is a heptatonic scale with its tritone removed. What's left is
a single chord you cannot play a wrong note in.

NON-NEGOTIABLES — these are permanent house rules, violating any one is a bug:

1. THEORY CORRECTNESS
   - A note is { letter, alt, octave }. NEVER a bare MIDI integer.
   - Build the parent 7-note scale FIRST with one letter per degree, THEN remove
     the omitted degree. Never remove-then-respell.
   - All 12 keys must spell with no repeated letters, no triple accidentals.
     The verified table is docs/01-THEORY.md section 8. Make it a test.
   - ONE parent hexachord + a mode index. NEVER separate "major hexatonic" and
     "minor hexatonic" objects — they are the same six notes (Theorem 2).
   - A chord is a PITCH-CLASS SET carrying a LIST of names, never one root + one
     quality. Am7 and C6 are one object with two readings, and tapping the label
     must flip between them.

2. VEXFLOW ENGRAVING — the full checklist is docs/02-APP-SPEC.md section 2.2.
   The ones that bite hardest:
   - NEVER hand-build beams. Use VF.Beam.generateBeams(barNotes, { groups:
     [new VF.Fraction(1,4)], maintain_stem_directions: false }) per bar, after
     creating notes, BEFORE Formatter.format; draw beams after voice.draw.
   - Cut every note at barlines and tie the fragments. Nothing crosses a barline.
   - A stave's y is the top of its BOX, not its top line. Build staves, then ask
     getYForLine(0)/getYForLine(4) where the lines landed, and size from that.
   - VexFlow sizes its root SVG with an INLINE absolute-pixel style. Beat it in
     CSS with `width:100% !important; height:auto !important`.
   - width:100% blows up SHORT scores. Cap the FRAME, not the SVG, at about
     naturalWidth * 1.15.
   - Nothing renders before document.fonts.load("30pt Bravura") and
     ("30pt Academico") resolve.

3. AUDIO
   - Real sampled piano. A sine wave destroys credibility on a musicianship
     channel. DO NOT build a sampler from scratch and do not hunt for samples —
     copy the working one that already exists on this Mac:
        ../melakarta-sphere/public/audio/salamander/   (17 mp3s, 1.2 MB)
        ../melakarta-sphere/lib/audio.ts               (the loader)
     Then extend that loader with scheduling and notation-highlight sync.
   - Schedule against AudioContext.currentTime, never setTimeout.
   - Handle the AudioContext suspend/resume trap: resume on first gesture and
     again after tab-visibility changes.
   - One bar of count-in minimum. Metronome on its own gain node.
   - Note onsets must be frame-accurate against the notation highlight.

4. COPY AND TERMINOLOGY
   - Do NOT write "world's first" anywhere. It is false. Read
     docs/06-PRIOR-ART.md and use claim #2 from its table.
   - Carnatic terms must come from docs/07-CARNATIC.md verbatim. Do not invent or
     "improve" a konnakol syllable set, a raga scale, or a yati name. Anything
     that document marks UNVERIFIED must not appear as a factual claim in the UI.
   - The minor hexatonic IS raga Pushpalathika (mela 22, dhaivata-varjya) and the
     app should say so. Sriranjani is NOT this scale -- it is panchama-varjya.
   - SCALE NAMES: use the modal-intersection names -- "Ionian/Lydian Hexatonic"
     (1 2 3 5 6 7), "Ionian/Mixolydian Hexatonic" (1 2 3 4 5 6, the Guidonian
     hexachord), "Dorian/Aeolian Hexatonic" (1 2 b3 4 5 b7). NEVER label anything
     "gospel scale" (that name means 1 2 b3 3 5 6, the major blues scale) or
     "Sunday scale" (Peter Martin's term for a different scale), and never ship a
     bare "major hexatonic" (ambiguous -- usually means the no-7 collection).
   - The avoid-note doctrine is HARMONIC, not melodic: the note is barred from
     voicings and sustained notes, fine as a passing tone. Do not write "never play
     the 4th". The b6-over-minor case is genuinely contested -- present it as such.
   - Do NOT write "before music had 7 notes it had 6" -- historically false.

BUILD ORDER — ship in this sequence, do not skip ahead:

M1  Port engine/shadava_theory.py to TypeScript, headless. Unit-test (Vitest)
    against engine/verified.json: the omission survey, the six modes, the chord
    sets, all four skip cycles, the 12-key spelling table, the resolution grid.
    NOTHING VISUAL UNTIL THESE PASS. Correctness is won or lost here.
M2  Notation: render an arbitrary drill correctly in all 12 keys with the full
    VexFlow checklist honoured. Eyeball C, F#, Db, Eb specifically.
M3  Audio + frame-accurate highlight + count-in + metronome + loop.
M4  /practice — all controls, the RESOLUTION BANNER, the ghost note, URL state.
M5  /learn and /scales — the five theorems as interactive cards, each with an
    audible A/B proof.
M6  /live presenter mode (huge type, keyboard shortcuts, no dialogs, offline-safe)
    and the standalone /resolution calculator.
M7  SEO/OG/favicon/JSON-LD, PWA, then deploy.

THE THREE UI IDEAS THAT MAKE OR BREAK IT
  - THE RESOLUTION BANNER: always visible, always live — "resolves in 5 bars ·
    60 notes · khanda gati". If a combination would take 21 bars, warn in amber
    BEFORE play is pressed. This is what makes the app feel intelligent.
  - THE GHOST NOTE: on the keyboard and the staff, show the REMOVED note greyed
    out. The concept is subtractive; make the subtraction visible.
  - URL STATE: every drill configuration is a shareable link. Non-optional —
    Jason pastes these into WhatsApp and YouTube descriptions.

STACK: Next.js App Router + React + TypeScript on Vercel; VexFlow 5 with
self-hosted Bravura + Academico; Web Audio with sampled piano; Tailwind,
dark-first, NSM palette; Vitest. No database, no auth, no backend in v1. PWA so
it works offline — the live shoot cannot depend on venue wifi.

DEPLOY RULES (house rules, not suggestions)
  - Commit and push at every milestone. Commit as music@nathanielschool.com or
    Vercel refuses the deploy — there is no global git config on this Mac.
  - Public site gets a PREVIEW URL first. main only after Jason approves.
  - Verify the LIVE deploy before saying done: curl the URL, check the notation
    actually renders, check audio starts.

WHEN YOU FINISH, tell Jason in plain language: what works, what you verified and
how, what you did NOT build, and the live URL. No terminal instructions.
```

---

## BLOCK B — Codex variant, theory engine only

Use this if you want the engine ported and tested before any UI exists.

```
In /Users/jasonzac/Documents/Claude/shadava, port engine/shadava_theory.py to
TypeScript as a standalone, dependency-free, headless module at src/lib/theory/.

Read engine/shadava_theory.py, engine/VERIFIED-OUTPUT.txt, engine/verified.json
and docs/01-THEORY.md first. The Python file is the specification; the JSON is
the expected output.

Port these exactly, preserving behaviour:
  - Note as { letter, alt, octave } with pc, midi, name and vexflow() accessors.
    NEVER represent a note as a bare integer.
  - buildDiatonicScale(tonic, modeSemitones) — one letter per degree, correct in
    all 30 key signatures.
  - hexatonicByOmission(tonic, mode, omitDegree) — build parent first, then omit.
  - normalOrder / primeForm / intervalVector  (note: normal order minimises the
    OUTER SPAN first, then packs left — a naive lexicographic min is wrong and
    will silently mislabel set classes).
  - modalRotations(scale) — the six modes with degree labels.
  - findChords(scale) — returns pitch-class SETS each carrying a LIST of names,
    grouped so that Am7 and C6 come back as one object with two names.
  - skipCycle(scale, skip) + interval naming (generic letter distance + specific
    semitones, so an augmented 4th is never mislabelled a perfect 4th).
  - solveResolution(...) with BOTH modes: 'accent' (accent returns to beat 1) and
    'full' (accent + tonic + downbeat coincide).
  - sequenceCells(...) for the pattern generator.

Then write Vitest tests that assert the ported engine reproduces every table in
engine/verified.json: the 7-row omission survey, the six modal rotations, the
chord sets for major-no-4 and minor-no-b6, all four skip cycles, the 12-key
spelling table, and the full resolution grid. Property-test that for any valid
drill spec the resolved bar count is a whole number.

Do not build any UI. Do not add dependencies. Report which tests pass.
```

---

## Notes on using these

- **Block A assumes the repo is already at
  `/Users/jasonzac/Documents/Claude/shadava`** with the `docs/` and `engine/`
  folders in place. It is.
- The prompt deliberately points at **melakarta-sphere's `KritiScore.tsx`** and
  **rhythm-arithmetic's `NOTATION_STANDARD.md`** as reference implementations,
  because those are the two places where the VexFlow problems were already solved
  properly on this machine. Any new notation code should look like those.
- **M1 is the gate.** If the model tries to build UI before the engine tests pass,
  stop it and point at the build order. Every scale app that goes wrong goes wrong
  by starting with the pretty part.
