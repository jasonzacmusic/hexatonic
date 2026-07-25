# SHADAVA — Prior Art & What We Can Honestly Claim

> **Read this before writing a single word of marketing copy, and before saying
> anything on camera.** The "world's first hexatonic app" claim does not survive
> contact with reality. Better claims exist and they are stronger anyway.

---

## 1. The verdict

**"World's first hexatonic scale app" — FALSE.** Two products defeat it outright:

### The name collision
**Hexatonics – Triad Pairs To Go** — an iOS/iPadOS/macOS/visionOS app literally
named *Hexatonics*, released **16 January 2025**, $0.99.
· https://hexatonics.info/
· https://apps.apple.com/us/app/hexatonics-triad-pairs-to-go/id6740587509

68+ curated triad pairs, all-12-key transposition, colour-coded chord diagrams,
parent-scale context. **What it does not have:** audio playback, notation, drills,
metronome, pattern generation, MIDI. One of its own App Store reviews reads
*"Finally someone made an app for improvising with hexatonics"* — which is
approximately the sentence we would have been trying to claim.

### The real competitor
**mDecks Tessitura Pro** has shipped **"Bi-Triadic Hexatonic Scales"** as a named,
taught, practisable feature since **2 June 2017**.
· https://mdecks.com/tessituramac.phtml
· http://mdecks.blogspot.com/2017/06/bi-triadic-hexatonic-scales-swing-in.html

And it has the whole practice stack: all 2048 twelve-tone scales, a **step-skip
Pattern Randomizer** (user-definable, up to 12 steps), rhythmic shapes, a custom
exercise builder, practice workouts in all keys, **odd-meter practice in 5/4,
7/8, 12/8**, staff notation, printable sheets, audio playback, MIDI input, and
progress tracking. Paid: $5.99/mo, $49.99/yr, $99.99 lifetime.

**This one also defeats the softened claim** "the first app that treats the
hexatonic as a first-class practice system." That is a fair description of
Tessitura Pro's bi-triadic module. Do not use that line either.

### Also relevant
- **ScaleBank: Guitar Scales** names "Hexatonic Blues" and has drills that play
  patterns ascending/descending and **"in patterns of three"** against a
  metronome. Guitar-only, no staff notation, one documented grouping size.
- ~12 general scale libraries list hexatonics among thousands of scales (Ian
  Ring's *A Study of Scales*, Sonid, Piano Encyclopedia, muted.io, pianoscales.org,
  Chord Scale Reference, Harmonia, and others). Weak prior art, but it exists.
- **Roy Ziv's Hexatonic Scale Masterclass** ships 30+ hexatonic sequencing
  exercises through JTC Guitar's interactive TAB player — software delivering
  hexatonic sequencing, though not a generator.

### Confirmed clean misses (i.e. things that do *not* compete)
iReal Pro has **no hexatonic content at all**. ScaleMate has the augmented scale
but never uses the word "hexatonic". Bergonzi's *Hexatonics* (Inside Improvisation
Vol. 7), Weiskopf's *Intervalic Improvisation*, Campbell's *Triad Pairs for Jazz*
and Open Studio's *Triad Pairs Training* are **books and video courses — no app
has ever existed** for any of them. A GitHub search for `"hexatonic scale
practice"` returns **zero results**.

---

## 2. The whitespace that IS real

No product found combines all six of these:

1. hexatonics as the **organising principle**, not a filter in a 2048-scale list
2. **generated** pattern sequences in arbitrary groupings of 3 / 4 / 5 / 6 / 7
3. against a **user-chosen meter**, with the resolution computed
4. live **staff notation**
5. real **audio playback**
6. **free**, in a **browser**

Tessitura Pro overlaps on 2–5 but is a paid native encyclopedia. *Hexatonics*
owns 1 but has none of 2–5.

### And the genuinely empty room — this is the finding that matters

The research swept the Carnatic app market specifically: **Talanome, Layam, Tala
Shruti, Jalra, Carnatic Tala Box, KorvAI** — all of them are **rhythm/tala-only**.
KorvAI outputs solkattu syllables, not swaras. The real analogue to what we're
building — **Sarali / Janta / Dhatu Varisai** — exists digitally **only as fixed,
pre-composed content** (Riyaz, standalone Android varisai apps).

> **There is no generator of melodic groupings against a tala. Anywhere.**

That is a verified, citable gap, and it happens to be precisely what the
resolution solver in `docs/03-RHYTHM-ENGINE.md` does. **This — not the word
"hexatonic" — is the app's actual moat.**

---

## 3. What to say instead

In descending order of safety:

| # | claim | risk |
|---|---|---|
| 1 | **"A practice tool built entirely around the hexatonic scale."** | none — true, no superlative |
| 2 | **"The only free, browser-based app built entirely around hexatonic practice."** | low — four qualifiers, each independently checkable. **Strongest claim to put in writing.** |
| 3 | **"Hexatonics finally get their own practice engine — generated patterns, real notation, real playback."** | low — implies novelty without "first"; defensible because the one hexatonic-dedicated app has none of those three things |
| 4 | *"the first hexatonic practice app that generates pattern sequences in any grouping against any meter, with live notation and playback"* | medium — a hostile reader points at Tessitura Pro's Pattern Randomizer |

**Recommendation: drop "first" entirely and lead with #2.** It is true, it is
checkable, and *"the only free one"* is a better hook than *"the first"* anyway —
"free" is a benefit, "first" is a boast.

### The one "first" that is actually available
If a superlative is wanted, claim it on the **rhythm** side, not the scale side:

> **"The first tool that generates melodic scale patterns in Carnatic groupings —
> tisra, chatusra, khanda, misra — and tells you exactly which bar they resolve
> on."**

That one survives scrutiny, because the research confirmed no such generator
exists in either the Western or the Carnatic app market. It is also more
interesting, more defensibly Jason's, and much harder for anyone to copy.

---

## 4. One terminology trap

A lot of the market's advertised "hexatonic support" is just **the blues scale
relabelled** (ToneGym, ScaleBank, arguably Tessitura's filter). So:

- A claim framed around **bi-triadic / triad-pair** hexatonics is on firmer
  factual ground than one framed around the bare word "hexatonic"…
- …but both *Hexatonics – Triad Pairs To Go* and Tessitura Pro's bi-triadic
  module already sit squarely in that narrower space, so it doesn't buy a "first".

The **diatonic** hexachord framing we're using (`no-4 major` / `no-b6 minor`,
Theorem 1) is far less contested in the app market than the triad-pair framing —
most competitors go straight to jazz triad pairs and skip the gospel/folk
hexachord entirely. That is a content opportunity, not a claim.

---

## 5. Consequence for the YouTube episode

Do **not** open with "world's first app." Open with the **theorem** — that is
genuinely novel framing, it is provable on screen in 90 seconds, and nobody can
rebut arithmetic with a link.

The pedagogical claim in `docs/03-RHYTHM-ENGINE.md §3` — *the hexatonic resolves
2–7× faster than the major scale in every grouping, therefore it is the correct
scale on which to teach rhythmic grouping* — is **new, defensible, checkable with
a calculator, and much more interesting than a novelty claim.** Lead with that.
