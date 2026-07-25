# SHADAVA prototype

A working single-page app. Not the real build — a playable proof that the theory
engine, the resolution solver, the notation and the audio all work together.

## Run it

```bash
/usr/bin/python3 ~/Documents/Claude/shadava/prototype/serve.py 8793
```

Then open **http://127.0.0.1:8793**

It must be served over http, not opened as a file — browsers block `fetch()` of
local mp3s from `file://`, so the piano would be silent.

## What's real in here

- **Theory engine** ported from `../engine/shadava_theory.py`. Notes are
  `{letter, alt, octave}`, never integers, so spelling is correct in all 12 keys
  (F# gives `F# G# A# C# D# E#`, not `Gb`).
- **Available harmony** is computed, not hardcoded — it finds C/Am/G/Em and
  C6=Am7, Cmaj7, Em7=G6 by itself, and shows both names for one chord.
- **The resolution solver** drives the banner. Its numbers match
  `../engine/VERIFIED-OUTPUT.txt` exactly (48 notes/3 bars, 60/5, 240/15).
- **Notation** is VexFlow 4.2.2 with Bravura bundled — beams generated per beat,
  never hand-built; accents on group starts; tuplets for triplet subdivisions.
- **Audio** is the real Salamander grand piano (17 samples, pitch-shifted),
  driven by a lookahead scheduler rather than `requestAnimationFrame`.

## The one control people miss

**Top note.** Turning it on adds the octave, which makes the pattern 7 notes —
and 7 shares factors with nothing, so the drill takes 7 bars to resolve instead
of 3, or 35 instead of 5. Both are musically valid; the app makes you choose
rather than deciding silently.

## Known gaps (deliberate, this is a prototype)

- Notation caps at 24 bars on screen; playback still runs the whole drill.
- No URL state, no PDF export, no MIDI in, no presenter mode.
- `/live`, `/learn` and `/resolution` from the spec don't exist yet.
