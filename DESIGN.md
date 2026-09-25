# Design

The incumbent visual world, recorded after the design pass of 2 Aug 2026.
Identity was deliberately preserved — this documents what is already here plus
the rules the pass introduced. Read it before changing any shared surface.

## The world

Warm near-black, gold, and cream. A lamp-lit practice room at night, not a
neon dashboard. The signature object is `ScaleRing`: a chromatic clock where the
six notes you have are filled and joined into a polygon and the note that was
removed is a hollow dashed red marker sitting in the gap it left. It shows the
shape of the scale and the shape of the absence at once.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0908` | page |
| `--surface` | `#14120F` | `.card` |
| `--surface2` | `#1D1A16` | controls, chips |
| `--line` | `#2A2523` | hairlines |
| `--gold` | `#C9A227` | the scale, primary action |
| `--gold-hi` | `#F3D765` | active/lit state |
| `--red` / `--red-deep` | `#E8666C` / `#8B1E24` | the removed note, stop |
| `--cream` | `#F4EFE4` | body text |
| `--muted` | `#A79E94` | secondary text |

**`--muted` lives in two places.** `globals.css` sets the custom property and
`tailwind.config.ts` sets the `muted` utility colour. The `text-muted` class
resolves from the Tailwind config, *not* from the custom property — change one
and you must change the other, or every `text-muted` silently keeps the old
value.

A warm bloom sits behind everything (`body background-image`, two low-alpha
radial gradients, `background-attachment: fixed`) so the black is never flat.

## Type

Archivo (sans) / Cormorant (serif) / IBM Plex Mono (mono).

- `.display` — headings, black weight, tight tracking
- `.lede` — 17px, capped at 62ch
- `.quiet` — 14px muted, capped at 68ch
- `.pull` — Cormorant italic, for the one-line argument
- `.eyebrow` — 12px mono caps, 0.12em tracking
- `.micro` / `.micro-caps` — the small-text primitive

**Hard floor: 12px for anything functional.** No 9px, 10px or 11px text
anywhere a user has to read a label, value or control. Tracking above 0.12em is
reserved for one- or two-word labels; a sentence never goes uppercase, because
caps strip the ascender and descender shapes the eye reads words by.

**Measure.** `main :where(p, li) { max-width: 72ch }` is the base rule; it uses
`:where()` so any explicit `max-w-*` utility still wins. Do not put `max-w-3xl`
on a paragraph of 14px text — 768px at that size is 110 characters a line.

## Surfaces and depth

Two levels, and only two:

- `.card` — the raised surface. Hairline border, a 1px contact shadow and one
  short soft lift. **Never a hairline border under a wide soft shadow** — that
  combination is the stock AI card.
- `.well` — a panel *inside* a card. A darker fill and nothing else: no border,
  no shadow, not even an inset highlight. A second ring of chrome inside a card
  is the depth-stacking this exists to replace.

## Light

**No coloured glows.** No zero-offset chromatic halo behind type, no coloured
blurred shadow on a dark background. Buttons and lit chips get an inset white
top highlight plus a neutral shadow, which is how a real raised surface catches
light. `.glow-gold` is retained as a no-op so old markup cannot reintroduce one.

## Motion

Entrances are ease-out — `cubic-bezier(0.16, 1, 0.3, 1)` over 0.42s, an 8px
rise. Stagger is ~50ms and the whole group lands inside 200ms; past that the eye
watches items queue instead of arriving together. The ring's decorative sweep is
72s and must never rotate the labels. Every animation is disabled under
`prefers-reduced-motion`.

## Editorial rules

- **No kicker above a heading.** A tiny tracked label as its own block above a
  heading is scaffolding. If the words matter, they go *into* the heading — the
  Learn page's theorem numbers lead their h2 rather than floating above it.
- **No numbered section labels.** Six cards in a grid are already visibly a set.
- Padding belongs on the wrapper, not the paragraph: a `<p>` with its own `px-5`
  is inset visually but its element box still runs to both viewport edges.

## Known detector false positives

`npx impeccable detect http://localhost:3311/<page>` is the quality gate, but
two of its rules mis-fire on this app. Do not "fix" these by degrading the
design:

1. **`low-contrast` (~79 findings).** Its analytic compositor reads the body's
   low-alpha warm bloom as near-solid gold. Verified by hand: the Learn page
   h2s are cream `#F4EFE4` on `#14120F` = **16.3:1**, reported as 1.1:1; the
   ring labels are **10.1:1** against the true composited backdrop, reported as
   2.1:1. Brightening text makes its number go *down*, which is the tell.
2. **`text-occlusion` on the ring centre label.** The overlay carries
   `pointer-events-none`, so `elementFromPoint` returns the SVG polygon beneath
   it. The text paints on top and is fully legible.

Everything else the detector reports on this repo has been genuine.
