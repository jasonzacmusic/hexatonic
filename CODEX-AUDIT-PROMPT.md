# Codex audit — copy-paste this whole block

Paste everything inside the fence. Nothing else needs saying first.

```
You are auditing and improving a live music-education web app. Be genuinely critical —
I want the problems found, not reassurance.

REPO      https://github.com/jasonzacmusic/hexatonic
LIVE      https://hexatonic.nathanielschool.com
ALIAS     https://hexatonic.vercel.app
STACK     Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind · VexFlow 4.2.2
          · Web Audio with sampled piano · Vitest · deployed on Vercel
RUN       npm install && npm run dev   → http://localhost:3311
TEST      npm test                     → 56 tests, must stay green
BUILD     npm run build

WHAT IT IS
A practice tool for six-note (hexatonic) scales. You pick a key, a scale family, a
mode and a pattern; it generates a drill in a rhythmic grouping of 3 to 9, renders it
as real staff notation, plays it on a sampled grand piano, and tells you exactly how
many bars it takes before the pattern lands back on the downbeat with the accent.

The core musical thesis, which the app proves rather than asserts: a major scale
contains exactly one tritone, and removing the 4th or the 7th — and only those two —
leaves a six-note scale with none.

READ FIRST, IN THIS ORDER
  docs/09-ROADMAP.md      every unbuilt feature, the known-issues table, and the
                          permanent naming guardrails. START HERE.
  docs/01-THEORY.md       the five theorems the app is built on
  docs/02-APP-SPEC.md     architecture, data model, and the VexFlow/audio house rules
  docs/03-RHYTHM-ENGINE.md the resolution solver and the Carnatic grouping system
  docs/06-PRIOR-ART.md    what may and may not be claimed in copy
  docs/07-CARNATIC.md     VERIFIED Carnatic terminology, plus an explicit UNVERIFIED list
  docs/08-JAZZ-GOSPEL.md  VERIFIED Western/jazz theory, plus eleven corrections that
                          were made to earlier drafts — read section 1 before writing
                          any user-facing copy
  engine/shadava_theory.py  the Python reference implementation
  engine/verified.json      the oracle the TypeScript engine is tested against

═══════════════════════════════════════════════════════════════════════════
PART 1 — AUDIT. Report findings; do not fix silently.
═══════════════════════════════════════════════════════════════════════════

Go after these in roughly this order of value:

1. MUSICAL CORRECTNESS — the thing that must not be wrong.
   - Spelling in all 12 keys for all 7 families and all 6 modes. F# major hexatonic
     must give F# G# A# C# D# E#, with no letter used twice and no triple accidentals.
   - Interval naming must be by letter distance, so F–B is an augmented 4th and never
     a perfect one. The whole of Theorem 5 depends on this.
   - The chord finder must return pitch-class SETS carrying a LIST of names. Am7 and
     C6 are one object with two readings, not two chords.
   - The resolution solver against docs/03. Try to find a combination where the
     reported bar count is wrong or non-integral.
   - Anywhere the UI states a musical fact that the engine did not compute.

2. AUDIO AND TIMING
   - src/lib/audio/engine.ts uses a setInterval lookahead scheduler because
     requestAnimationFrame is throttled when the tab loses focus (that bug once let a
     48-note loop run 457 notes past its end). Verify the scheduler under: tab
     backgrounded, tempo changed mid-play, rapid start/stop, loop on and off, and a
     420-note drill.
   - Are note onsets actually frame-accurate against the notation highlight?
   - AudioContext suspend/resume on visibility change and on iOS.
   - Look for leaked BufferSource nodes on repeated start/stop.

3. NOTATION (src/components/Notation.tsx)
   The house rules are in docs/02 section 2.2 and they are not negotiable — beams
   generated per beat and never hand-built, nothing crossing a barline, the stave's y
   being the top of its box rather than its top line, the inline SVG sizing beaten in
   CSS, the frame capped at natural width. Check all of them hold, then check tuplets
   in triplet and sextuplet subdivisions, accidentals in remote keys, and what happens
   at 1 bar and at 35 bars.

4. PERFORMANCE
   - The full score re-renders on any state change. Measure it. Memoise or virtualise.
   - Long drills build a large notes array. Look for avoidable allocation.
   - Bundle size, and whether VexFlow is still lazy-loaded out of the shared chunk.
   - Core Web Vitals on the live URL, mobile included.

5. ACCESSIBILITY — never audited, so assume it is bad.
   - Contrast ratios, especially muted text on surface.
   - The ScaleRing conveys meaning by colour alone; it needs a non-colour channel.
   - Keyboard navigation, focus order, focus traps, screen-reader labelling of the
     notation and the keyboard.

6. CORRECTNESS OF THE BUILD AND DEPLOY
   - The service worker cache constant is hardcoded ("hexatonic-v1") and must be
     bumped on every deploy or users get stale assets. Fix this properly.
   - Fonts load from Google Fonts, so the offline PWA falls back to system fonts.
   - There is no CI. Add GitHub Actions running npm test and npm run build on push.

7. CODE QUALITY
   - Component tests and E2E: there are none. Only the theory engine is tested.
   - Dead code, prop drilling, anything in src/lib/useDrill.ts that should be split.
   - src/lib/theory/* is the crown jewels — it must stay pure, dependency-free and
     framework-agnostic. Flag any React or DOM leakage into it.

═══════════════════════════════════════════════════════════════════════════
PART 2 — DESIGN AND UX. You have real freedom here.
═══════════════════════════════════════════════════════════════════════════

The current design is a deliberate art direction, not an accident: near-black warm
base, gold as the active/primary colour, red reserved *exclusively* for "the note that
was removed", cream for everything else. Archivo for display, Cormorant italic for
editorial lines, IBM Plex Mono for all data and labels. The signature visual is
ScaleRing — a chromatic clock where the six notes present are filled and joined into a
polygon and the removed note is a hollow red ring sitting in the gap it left.

YOU MAY change any of this, including the art direction, if you can do better. Be
ambitious. Make it more artistic if you see the opportunity. Two constraints only:

  (a) KEEP THE COLOUR SEMANTICS. gold = sounding now, red = the removed note,
      cream = the rest of the scale. That rule is the information design of the whole
      app and students learn it in the first ten seconds. Change the palette if you
      like, but keep one colour meaning "this is the note that is gone".
  (b) It must stay legible from a piano bench three metres away on /live, and it must
      work on a phone.

What I most want from you here:
  - ALIGNMENT AND RHYTHM. Optical alignment, a consistent spacing scale, consistent
    corner radii and border weights. Right now some rows are eyeballed rather than
    systematic. Impose a real grid.
  - The /practice control panel is dense and desktop-first. It needs a genuine mobile
    layout, not a reflow.
  - Motion with intent — the moment the phrase lands on the downbeat should feel like
    something. Currently it is a subtle pulse. Honour prefers-reduced-motion.
  - /live is presenter mode for a YouTube shoot. Huge type, no dialogs, nothing that
    shifts layout mid-take, every action on a key. Push this further.
  - The notation sits on a cream panel inside a dark app. That contrast is jarring;
    solve it better than I did (a dark-mode stave is possible with VexFlow).
  - A real empty/loading state for the piano samples, which take a moment on first load.

═══════════════════════════════════════════════════════════════════════════
PART 3 — BUILD SOMETHING FROM THE ROADMAP
═══════════════════════════════════════════════════════════════════════════

After the audit, pick from docs/09-ROADMAP.md and implement. My priorities, highest
first — but if the audit turns up something more urgent, say so and do that instead.

  1. MIDI INPUT AND GRADING (roadmap 2.1). The engine already knows the expected note
     at every tick. Accept Web MIDI, compare what was played, report the notes AND the
     accents that were missed. This turns a display into a teacher and it is the single
     highest-value thing left.
  2. IMPROVISATION MODE (roadmap 2.2). The one thing I asked for originally that is
     completely missing — drones, vamps per mode, "blow over this" rather than running
     patterns, and the available triads shown as real voicings.
  3. TALAS BEYOND 4/4 (roadmap 3.4). The drill is hard-wired to 4/4 even though the
     solver already accepts any meter. This is the biggest functional gap.
  4. TRIAD-PAIR GENERATOR (roadmap 3.1). The engine functions and the validation rules
     already exist in src/lib/theory/chords.ts. There is no UI at all.
  5. PRINT / PDF EXPORT (roadmap 2.3).

═══════════════════════════════════════════════════════════════════════════
NON-NEGOTIABLES
═══════════════════════════════════════════════════════════════════════════

- npm test must stay green. If you change the engine, the 56 tests are the oracle —
  do not weaken an assertion to make it pass. engine/verified.json is generated by
  engine/shadava_theory.py; if a value genuinely needs to change, regenerate the
  oracle deliberately and say so.
- A note is { letter, alt, octave }. NEVER a bare MIDI integer. This is the only
  reason spelling is correct in every key.
- Build the parent 7-note scale first, THEN remove the omitted degree. Never
  remove-then-respell.
- NAMING — all of these were got wrong once and corrected, so do not reintroduce them:
    · never "world's first" (an iOS app called Hexatonics predates this, and mDecks
      Tessitura Pro has taught bi-triadic hexatonics since 2017)
    · never "gospel scale" for this collection (that name means 1 2 b3 3 5 6, the major
      blues scale)
    · never "Sunday scale" (Peter Martin's term for a different scale)
    · never a bare "major hexatonic" (ambiguous — usually means the no-7 collection)
    · never "before music had 7 notes it had 6" (historically false)
    · use the modal-intersection names: Ionian/Lydian, Ionian/Mixolydian, Dorian/Aeolian
- Anything marked UNVERIFIED in docs/07 or docs/08 must not appear as a factual claim
  in the UI. When a source could not be confirmed, the app stays quiet.
- The avoid-note doctrine is HARMONIC, not melodic. Do not write "never play the 4th".
- Commit as music@nathanielschool.com or Vercel refuses the deploy. Branch, do not
  push straight to main. Open a PR.
- Deploy a PREVIEW and give me the URL. Do not promote to production.

DELIVERABLES
  1. A written audit: what is broken, what is fragile, what is merely untidy, ranked
     by how much it matters. Be blunt. If something I built is wrong, say so plainly.
  2. A PR with the fixes and whatever you built from Part 3.
  3. A preview URL I can open.
  4. A short note on what you chose NOT to do and why.

I am not a coder. Write the audit and the summary in plain language — tell me what it
means for the app and for my students, not just what the code does. No terminal
instructions; run things yourself.
```
