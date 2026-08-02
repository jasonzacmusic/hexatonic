# Product

<!-- impeccable:product-schema 1 -->

> Written from repository evidence (docs/01-THEORY.md, docs/09-ROADMAP.md, the
> engine, and the shipped pages) rather than a fresh interview. Facts marked
> INFERRED were not confirmed by Jason Zac and should be checked before being
> treated as binding.

## Platform

web

## Users

Practising musicians and music teachers. Two situations:

- a player at an instrument drilling six-note scales against a meter, needing
  the notation, the sound, and the bar-count to be exactly right;
- a teacher at a whiteboard or on camera, using the Presenter page live in a
  class and printing a drill sheet from the browser.

Carnatic and Western-jazz vocabulary both appear because the same user often
works in both.

## Product Purpose

Drill hexatonic (six-note) scales in every key, in melodic groupings of three
to nine, and report which bar the phrase resolves on. The theory is computed by
`engine/shadava_theory.py` and verified against `engine/verified.json` rather
than asserted, so every claim the interface makes is reproducible.

## Positioning

The rhythm side is the defensible part: no other tool generates melodic
groupings against a tala and reports the resolution bar. Carnatic apps
(Talanome, Layam, KorvAI) are rhythm-only; Sarali/Janta Varisai exists digitally
only as fixed content.

**"World's first hexatonic app" is false and must not return.** An iOS app named
*Hexatonics* shipped Jan 2025 and mDecks Tessitura Pro has covered bi-triadic
hexatonic practice since 2017. The safe claim is "the only free, browser-based
app built entirely around hexatonic practice."

## Operating Context

Used at an instrument, often with a MIDI keyboard attached, and live in class
via the Presenter page. Works offline (PWA + service worker). Printing is a
first-class output: the print stylesheet strips app furniture and renders the
drill on white.

## Capabilities and Constraints

Pages: `/ /practice /improvise /harmony /varisai /learn /scales /resolution
/live /about`. Next.js 15.5.x + React 19 + TypeScript + Tailwind, VexFlow 4.2.2
for engraving, Vitest for tests (162 passing).

Non-negotiable correctness rules, each guarded by tests:

- A note is a letter, an alteration and an octave — never a bare number.
- Chords are looked up by real interval, never by "every other scale degree";
  in a six-note scale that is not thirds.
- One hexachord plus a mode index is stored, never two separate scales.
- Barry Harris has four sixth-diminished scales, and the 7♭5 member maps to
  itself at the tritone, so it has 6 transpositions and not 12.
- Vercel rejects Next 15.1.6 as vulnerable; stay on >= 15.5.x.

## Brand Commitments

Shipped as **Hexatonic** — the plain English name, on Jason Zac's instruction.
Sanskrit (ṣāḍava) survives only as a roadmap note on `/about`. Built by
**Jason Zac** at Nathaniel School of Music — that spelling is fixed.

## Evidence on Hand

`docs/` carries the verified theory with explicit UNVERIFIED lists
(07-CARNATIC.md, 08-JAZZ-GOSPEL.md). There are no testimonials, user counts,
pricing, or press to cite, and none must be invented. The app is free.

## Product Principles

1. Compute it, then verify it against an independent implementation. A claim
   the engine cannot reproduce does not ship.
2. Every theoretical claim should be audible — a button beats a paragraph.
3. Name the ambiguity rather than flattening it (modal-intersection names,
   two equally correct chord readings).
4. Be honest about prior art in the product itself, not just in the docs.
5. The rhythm side is the moat; invest there first.

## Accessibility & Inclusion

Played from a keyboard, so real focus rings are required throughout.
`prefers-reduced-motion` disables the ring spin, entrance rises, and pulses.
Functional text has a hard 12px floor (see DESIGN.md).
