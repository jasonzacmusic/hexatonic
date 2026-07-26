# Hexatonic audit — 25 July 2026

This is the blunt version. The mathematical core is strong, but the live app is
not ready to be trusted as a teaching instrument yet. The two worst problems are
in playback: the piano is muted by the transport itself, and stopping does not
stop already-scheduled clicks.

The audit was completed before repairs. Findings below describe the production
state at commit `32b8efc`.

## Executive verdict

| Rank | Verdict | What it means for a student |
|---|---|---|
| **Broken** | The piano master gain fades to zero every time playback starts and is not restored while playback is active. | A student can hear the click but not the sampled piano. The app appears partly alive while its main musical output is silent. |
| **Broken** | Stop does not cancel scheduled click oscillators. | After a rapid stop, clicks can continue for several seconds. That is especially damaging in presenter mode. |
| **Wrong** | The audio is transposed one octave above the staff and keyboard highlight, with no visible control. | The note shown and the pitch heard disagree by an octave. |
| **Wrong** | Remote-key notation has no key signature and prints every altered note as an accidental. | The internal spelling is correct, but the score teaches the wrong engraving habit. |
| **Unsafe** | URL state accepts invalid patterns, subdivisions, groupings, modes and tempos without validation. | A malformed shared drill link can break the practice screen instead of falling back safely. |
| **Misleading** | Public copy says “nothing dissonant remains” and claims five traditions independently arrived at the same omission. | The first statement is musically false—removing a tritone does not remove every dissonance. The second is not supported by the cited research. |
| **Stale-prone** | The service-worker cache is permanently named `shadava-v1`. | A returning student can keep an old app after a new deployment. |
| **Unprotected** | There is no CI and `main` has no branch protection. | A broken test or build can be pushed and deployed without a gate. |

## 1. Musical correctness

### What passed

- The Python oracle regenerates byte-for-byte: both files have SHA-256
  `37f21506b660c3a96db323539ae6095827f69da29bc4b7666c1b2a8d9da8365b`.
- All 56 existing theory tests pass.
- F-sharp Ionian/Lydian hexatonic is correctly spelled
  `F# G# A# C# D# E#`.
- All 12 keys, seven six-note families, six diatonic modes, and the five- and
  seven-note parent modules build without a triple accidental.
- `F–B` is correctly named `A4`, never `P4`.
- Chords are correctly stored as pitch-class sets with multiple readings:
  `C6 = Am7` and `Em7 = G6`.
- An independent `music21` comparison found zero prime-form disagreements
  across all 924 six-note pitch-class sets.
- The resolution solver matched an independent calculation for **1,219,680**
  valid combinations of pattern length, subdivision, meter, grouping and
  resolution mode. No non-integral bar count was found.

### What failed

1. **The sound is an octave above the written note.** The theory note is converted
   to MIDI and then silently shifted by `+12`. The keyboard still highlights the
   unshifted note.
2. **Key signatures are absent.** F-sharp major material is internally spelled
   correctly, but VexFlow is never given the F-sharp key signature. Every sharp
   is drawn manually instead.
3. **The major-scale module has no Forte label.** The code maps the wrong prime
   form to `7-35`, so the UI displays an em dash instead of `7-35`.
4. **The scale-library promise is false for synthetic scales.** The page says no
   family repeats a letter, but the blues collection necessarily spells both
   `Gb` and `G`.
5. **Several statements outrun the engine.** “No tritones” is computed. “Nothing
   dissonant remains” and “the most consonant six-note set” are not.

## 2. Audio and timing

### Production proof

- After pressing Play on the live app, the AudioContext state was `running`,
  the click bus gain was `0.3`, and the piano master gain was exactly **`0`**.
- In a rapid start/stop test, **four future click onsets** remained scheduled
  after Stop, with the click bus still audible.

### Root causes

1. `start()` calls `stop(true)`. `stop()` fades the master gain to zero and only
   restores it if playback is still stopped 160 ms later. `start()` immediately
   marks playback active, so restoration is deliberately skipped.
2. Buffer sources are tracked, but click oscillators are not.
3. Concurrent first-play calls race: the second `init()` returns while the first
   is still loading instead of awaiting the same load promise.
4. A failed sample load leaves `loading = true`, so retry can enter a silent,
   half-initialised engine.
5. Tempo, loop, click and octave changes made during playback update the screen
   but not the scheduler’s captured options.
6. Natural completion calls the stop callback twice, and its animation-frame
   loop is not cancelled.

### What is sound in the design

- Scheduling uses `AudioContext.currentTime`, not `setTimeout`.
- A `setInterval` lookahead scheduler—not animation frames—owns audio.
- Highlight position is derived from the same AudioContext clock.
- The 420-note case is not scheduled all at once; the lookahead bounds the number
  of live sources.

The architecture should be repaired, not replaced.

## 3. Notation

### What passed

- Beams are generated with `Beam.generateBeams` per bar.
- Notes do not cross barlines because every event occupies one grid slot.
- Internal barlines use `BarNote`.
- Triplet and sextuplet durations are represented as tuplets.
- Highlighting changes SVG groups directly instead of rebuilding the score.
- The inline SVG width override is present.

### What failed

1. Key signatures and accidental memory are missing.
2. A one-bar triplet score creates a 1,040 px SVG for a stave roughly 412 px
   wide, leaving a large empty cream panel.
3. A 35-bar drill displays only 24 bars—384 of 560 written notes—while playback
   continues through all 35.
4. The component comments say stave height is measured from
   `getYForLine()`, but the implementation uses a fixed 128 px system height.
5. The notation has no useful screen-reader description.
6. The cream panel is visually disconnected from the rest of the app.

Changing a 420-note drill to the 35-bar configuration rebuilt 288 visible
VexFlow note groups in about **68 ms** on the production desktop. That is not a
catastrophe, but it is a blocking frame and should not happen for unrelated
state changes.

## 4. Performance

### Live Lighthouse, `/practice`

| Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desktop | 99 | 98 | 100 | 92 | 0.8 s | 0.0002 | 0 ms |
| Mobile | **79** | 98 | 100 | 92 | **4.7 s** | 0 | 40 ms |

These are lab results, not field data. Google’s public PageSpeed endpoint had no
usable quota during the audit, so no CrUX field verdict is claimed.

Other findings:

- VexFlow remains lazy and is not in the 103 kB shared first-load chunk. Its
  largest lazy chunk is about 577 kB uncompressed.
- The practice and presenter keyboard-listener effects detach and reattach on
  every drill render because they depend on the whole returned hook object.
- Long drills allocate a repeated full-note array even though the pattern is
  cyclic. The worst normal configurations are still only a few thousand
  references, so this is wasteful rather than dangerous.

## 5. Accessibility

The ScaleRing is better than the known-issues note suggests: it has both a red
cross and a screen-reader label, so the removed note is not colour-only.

The remaining failures are real:

1. Lighthouse detects an invalid heading jump from the page’s H1 to harmony H3s.
2. Segmented controls and toggles expose no `aria-pressed` state.
3. The playable SVG keyboard is mouse-only. Its keys cannot receive focus or be
   played with Enter/Space.
4. The generated staff is effectively absent to a screen reader.
5. The active navigation item has no `aria-current`.
6. Deep red text is below AA contrast on the dark surfaces. The muted colour
   narrowly passes; the red does not.

No focus trap was found because the app has no modal dialog. Ordinary form
controls follow a logical DOM order.

## 6. Mobile and presenter UX

- The 390 px layout has no horizontal overflow.
- It is still a desktop page stacked vertically: scale card, full ring, dense
  controls, resolution, score and keyboard. The most-used controls are too far
  apart for practice at an instrument.
- Presenter mode is stable and readable at desktop size, but preset labels and
  secondary data are too small for three metres.
- The shortcut handler accepts `8` even though grouping 8 is not an offered or
  named grouping.
- The UI changes a Play button into a wider Loading label, which can shift the
  presenter transport.
- The “resolution moment” is only a background change during the final beat; it
  does not yet deliver the promised visual payoff.

## 7. Build, deploy and maintenance

- Untouched baseline: `npm test` passes 56/56; `npm run build` passes.
- Production is live on Vercel and the custom domain returns 200.
- The alias in the brief also returns 200.
- Offline navigation to `/live` works after a first visit.
- Fonts are still loaded from Google at runtime. Offline navigation works, but a
  cold offline font load falls back to system fonts.
- `npm audit` reports one critical and three high vulnerabilities:
  Vitest 3.0.4, two PostCSS installations, and Sharp 0.34.5.
- `npm run lint` is not an automated check; it opens Next’s interactive setup
  prompt.
- GitHub has zero workflows and `main` is unprotected.

## Repair order chosen

The audit prompt permits a more urgent finding to replace the roadmap feature.
That exception applies here. MIDI grading depends on an accurate, stoppable,
observable transport; building it on the current scheduler would multiply the
failure modes.

This branch therefore repairs, in order:

1. audio start/stop/loading/timing and the octave mismatch;
2. URL validation;
3. key signatures, accidental handling and long/short score layout;
4. service-worker versioning and self-hosted fonts;
5. accessibility, mobile controls and presenter landing feedback;
6. unsafe public copy and missing theory labels;
7. dependency vulnerabilities, automated linting and GitHub CI;
8. focused regression tests for every repaired boundary.

MIDI grading, improvisation, non-4/4 drills, triad-pair UI and PDF export remain
roadmap work. They should start only after this foundation is merged and tested
on a real MIDI keyboard and piano-bench display.
