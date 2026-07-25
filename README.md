# SHADAVA — the six-note practice engine

## ▶ It's live — use it

**https://shadava-4wmm5aqpa-jasonzacmusics-projects.vercel.app**

- [/practice](https://shadava-4wmm5aqpa-jasonzacmusics-projects.vercel.app/practice) — the drill machine
- [/learn](https://shadava-4wmm5aqpa-jasonzacmusics-projects.vercel.app/learn) — the five theorems, each with a button that proves it by ear
- [/scales](https://shadava-4wmm5aqpa-jasonzacmusics-projects.vercel.app/scales) — every family in every key
- [/resolution](https://shadava-4wmm5aqpa-jasonzacmusics-projects.vercel.app/resolution) — the bar-count calculator
- [/live](https://shadava-4wmm5aqpa-jasonzacmusics-projects.vercel.app/live) — presenter mode for the shoot

This is a **preview** deployment, not production — per the house rule, main waits for
your approval. Say the word and it goes to `hexatonic.nathanielschool.com`.

Run it locally: `npm install && npm run dev` → http://localhost:3311
Run the theory tests: `npm test` (56 tests, gated against `engine/verified.json`)

---

**Read this page. Everything else is for Opus/Codex.**

*Shadava* (षाडव) is the Carnatic word for a six-note raga. The siblings are already
named by the tradition: **Audava** (5), **Sampurna** (7). The name gives you the
whole roadmap for free.

---

## What I found (the good part)

Your instinct about knocking off the 4th was not a preference. **It's a theorem,
and I proved it by computer.**

Remove each note of C major in turn and count the tritones left behind:

| removed | what's left | tritones |
|---|---|---|
| C, D, E, G, A | … | 1 |
| **the 4th (F)** | **C D E G A B** | **0** |
| **the 7th (B)** | **C D E F G A** | **0** |

The major scale has exactly one tritone: **F–B**. Removing either member of it —
the 4th or the 7th — and *only* those two, gives you a tritone-free scale. **Every
other removal leaves the tritone in.** That's why gospel, bluegrass, Celtic,
Carnatic and West African music all independently landed on "drop the 4 or the 7."
It isn't taste. It's the only way to de-tritone a scale.

**Your minor is the same theorem.** C natural minor's tritone is D–Ab. The two
legal removals are Ab (the b6 — exactly what you said) and D. Same rule, twice.

### Four more things came out of the maths

**1. Your major hexatonic and your minor hexatonic are the same six notes.**
C major no-4 = A minor no-b6 = **G A B C D E** — the hexachord Western musicians
learned to sight-sing with for centuries, Guido d'Arezzo's *ut re mi fa sol la*.
It also means the app stores ONE scale and rotates it, not two.

⚠️ **But don't say "before music had 7 notes, it had 6"** — I suggested that as a
title and the research killed it. The seven letters came first and underlie the
hexachord; the six syllables were a *sight-singing method*, not a claim about how
many notes music had. Safe version: *"for centuries musicians learned to sing on a
six-note unit, and these are exactly those six notes."*

**2. The scale *is* a chord.** Stack all six notes in thirds: **Cmaj13** from C,
**Am11** from A. Nothing left over. Every note is a chord tone — because the avoid
note is the note we removed. That's the theoretical reason for the "can't play a
wrong note" feeling. It's your best line: *"the scale with no wrong notes."*
(Phrasing caveat in the naming-trap section below — say the 4th is barred from
*chords and long notes*, not from being played at all.)

**3. You were right about the triads, exactly.** Four tertian triads only:
**C, Am, Em, G** (I–vi–iii–V). And only three 4-note sets, each with two correct
names: **C6 = Am7**, **Cmaj7**, **Em7 = G6**. You predicted "some of them would be
inversions of each other" — confirmed. Plus four quartal/sus stacks, which is why
this scale sounds like McCoy Tyner when you voice it in fourths.

**4. You were right about the thirds, and there's a bonus.** Playing the hexatonic
"in thirds" gives 2 major 3rds, 2 minor 3rds and **2 perfect 4ths** — exactly as
you said. But the real find is **"in fourths": every single degree gives a perfect
4th or perfect 5th. Six for six.** The major scale can't do it — F–B comes out an
*augmented* 4th and breaks the chain. **The note that breaks it is the note we
removed.** The hexatonic is the only common scale that cycles in unbroken perfect
fourths. That is checkable by anyone and safe to say on air.

---

## The rhythm system you described — it works, and here's the catch

Your grouping idea (3s, 4s, 5s, 6s, 7s until it lands on the 1) is arithmetic, and
I built the solver. **The headline:**

| grouping in 16ths, 4/4 | hexatonic | major scale |
|---|---|---|
| 3s | **3 bars** | 21 bars |
| 4s | **3 bars** | 7 bars |
| 5s | **15 bars** | 35 bars |
| 6s | **3 bars** | 21 bars |

**The six-note scale resolves 2–7× faster than the major scale in every grouping.**
Because 6 shares factors with almost everything and 7 shares factors with nothing.
**That means the hexatonic is the *correct* scale on which to teach grouping — not
the major scale.** That's a genuinely new pedagogical argument, and it's the reason
a live play-along is even possible: an audience can land a 5-bar cycle together.
They cannot land a 35-bar one.

⚠️ **One trap for the shoot.** Groups of 5 in straight 16ths takes **15 bars** to
resolve — too long for camera. The same 5s in **8th-note triplets resolves in 5
bars**. Use triplet subdivisions for the odd groupings on the stream. The app will
warn you before you press play.

And your 3/4/5/6/7 ladder already has a name in your own tradition: it's the
**gati** system (tisra, chatusra, khanda, misra, sankeerna), and going 3→4→5→6→7 is
**srotovaha yati** — the image is a river widening from its source. Using the real
vocabulary costs nothing and makes the app unmistakably yours.

---

## The best thing I found: your minor hexatonic is a real raga

I had the Carnatic literature searched properly. **Your minor hexatonic —
C D Eb F G Bb — is Raga PUSHPALATHIKA.** Janya of mela 22 Kharaharapriya,
**dhaivata-varjya**, six notes in both directions, straight, no vakra. Its
Hindustani twin with the identical pitch set is **Gaudgiri Malhar**.

And Dr M. Radhakrishnan's *Rare Raga Series* derives it **exactly the way you did**
— by adding a note to Madhyamavathi, or by making Manirangu's descent into its
ascent. First compositions by **Swathi Thirunal**.

> **You derived a real raga from first principles by removing the tritone.** That
> is your best moment on the live stream. Say it exactly like that.

**The major one is thinner and you should be careful.** C D E G A B is the
note-set of **Raga Shankara** (Hindustani, madhyam varjit — a first-rank raga, but
its actual *shape* skips Re in ascent). As a straight symmetric scale it's
**Ānandharoopa** in the Carnatic system, mela 29 — but that one is very rare and I
could only find it in web databases, no print authority. **There is no mainstream
raga whose scale is exactly C D E G A B both ways.** Safe wording is in
[07-CARNATIC.md](docs/07-CARNATIC.md).

⚠️ **One thing NOT to say: Sriranjani is not this scale.** It's *panchama*-varjya —
the opposite (it has the A, it's missing the G). That's exactly the slip a rasika
would jump on.

One more for the shoot. If you name a player who used the **augmented** scale, the
properly documented ones are **Michael Brecker** — and we have him saying so himself
in a 1998 interview, plus four analysed tunes ("Straphangin'", "Fawlty Tenors",
"Everything Happens When You're Gone", "Timeline") — and **Jerry Bergonzi** on
"Creature Feature". For **Oliver Nelson** say **"Hoe-Down"**, not "Stolen Moments",
and say it's a *written line in the bridge*, not a solo; the "Stolen Moments" version
is a mix-up Wikipedia spread. **Coltrane belongs in a different box:** his documented
innovation is root motion in major thirds, and the only augmented-*scale* claim is
about the melody of "One Down, One Up" — and even that is one author's speculation.
**Don't name Woody Shaw** — that one is refuted outright.

The research also caught **three of my own konnakol syllable sets being wrong**
(7 is canonically Ta Ka Di Mi Ta Ki Ta, 4+3, not 3+4) and that there are **six
yatis, not five**. All corrected, all flagged — including a list of things that are
still ⚠️ unverified and must not be said as fact.

---

## 🔴 One naming trap you must know about

**Never call this the "gospel scale."** That name is already taken, and it means a
*different* scale — `1 2 b3 3 5 6` (C D Eb E G A, the major blues scale). Jonny May
teaches two courses under that name. I had labelled your scale "Sunday/gospel"
throughout the first draft and it was wrong; it's fixed everywhere now.

**"Sunday scale" is also taken** — it's Peter Martin's, in Open Studio's *Elements
of Gospel Piano*. It is six notes, but its actual content is behind a paywall and I
couldn't verify it. Don't claim it.

And a bare **"major hexatonic"** more commonly means the *no-7* scale (C D E F G A),
not yours. So always qualify.

**The names to use instead** — these are sourced, from Cecil Sharp's folk-song
classification, and they explain themselves:

| your scale | ship this name |
|---|---|
| 1 2 3 5 6 7 | **Ionian/Lydian Hexatonic** — it refuses to commit to 4 or #4, which is exactly why it works over both maj7 and maj7#11 |
| 1 2 3 4 5 6 | **Ionian/Mixolydian Hexatonic** (the Guidonian hexachord) |
| 1 2 b3 4 5 b7 | **Dorian/Aeolian Hexatonic** — your minor |

Your "it's ambiguous between Dorian and Aeolian" instinct turns out to be the actual
academic naming convention. Nice.

One more: **when you say the 4th is an "avoid note," say it's barred from *chords and
long notes*, not from playing at all.** That's what the doctrine actually says, and
Mark Levine himself thought "avoid note" was a bad term. Lead with the **tritone**
argument instead — that one is arithmetic and nobody can argue with it.

## The bad news, and why it's actually good news

**"World's first hexatonic app" is false.** There's an iOS app literally called
*Hexatonics* (Jan 2025), and mDecks Tessitura Pro has shipped bi-triadic hexatonic
practice with pattern generation, notation and odd meters **since 2017**. If you
say "world's first" on air, one comment with one link ends it.

**What is true, and stronger:**

> **"The only free, browser-based app built entirely around hexatonic practice."**

And there's one superlative that *does* survive, on the rhythm side:

> **"The first tool that generates melodic patterns in Carnatic groupings —
> tisra, chatusra, khanda, misra — and tells you exactly which bar they resolve on."**

I had the market swept specifically for this. Every Carnatic app out there
(Talanome, Layam, Tala Shruti, KorvAI) is **rhythm-only**. Sarali/Janta Varisai
exists digitally only as fixed pre-recorded content. **There is no generator of
melodic groupings against a tala anywhere.** That's the empty room, and your
resolution solver walks straight into it. **That, not the word "hexatonic," is
the moat.** Full detail and citations: [06-PRIOR-ART.md](docs/06-PRIOR-ART.md).

---

## What's in this folder

| file | what it is | who reads it |
|---|---|---|
| **[BUILD-PROMPT-OPUS.md](BUILD-PROMPT-OPUS.md)** | **the copy-paste block for Opus** | you → Opus |
| [docs/01-THEORY.md](docs/01-THEORY.md) | the five theorems, verified | Opus |
| [docs/02-APP-SPEC.md](docs/02-APP-SPEC.md) | stack, screens, data model, VexFlow rules | Opus |
| [docs/03-RHYTHM-ENGINE.md](docs/03-RHYTHM-ENGINE.md) | grouping + resolution maths | Opus |
| [docs/04-YOUTUBE-LIVE.md](docs/04-YOUTUBE-LIVE.md) | 75-min run of show, team roles, promo ladder | you + team |
| [docs/05-CAN-OPUS-DO-IT.md](docs/05-CAN-OPUS-DO-IT.md) | **honest feasibility: what Opus can and can't carry** | you |
| [docs/07-CARNATIC.md](docs/07-CARNATIC.md) | **verified raga names, gati, konnakol, varisai ladder** | you + Opus |
| [docs/08-JAZZ-GOSPEL.md](docs/08-JAZZ-GOSPEL.md) | **verified Western/jazz theory + the 6 corrections** | you + Opus |
| [docs/06-PRIOR-ART.md](docs/06-PRIOR-ART.md) | what we may and may not claim | you |
| [docs/DESIGN-BRIEF-THUMBNAIL.md](docs/DESIGN-BRIEF-THUMBNAIL.md) | ready-to-paste Claude Design briefs | you → Claude Design |
| [engine/shadava_theory.py](engine/shadava_theory.py) | working engine — the spec Opus ports | Opus |
| [engine/VERIFIED-OUTPUT.txt](engine/VERIFIED-OUTPUT.txt) | its verified output — these are the tests | Opus |

Run the proof yourself any time:

```bash
cd "/Users/jasonzac/Documents/Claude/shadava/engine" && /usr/bin/python3 shadava_theory.py
```

---

## Your next three moves

1. **Paste Block A** from [BUILD-PROMPT-OPUS.md](BUILD-PROMPT-OPUS.md) into Opus.
   It's self-contained and points at everything else.
2. **Pick a shoot date.** The run of show is written; the promo ladder starts 7
   days out.
3. **Decide the name** — SHADAVA, or something plainer for a Western audience.
   My vote is SHADAVA: it's yours, it comes with the roadmap built in, and
   "hexatonic" is already taken on the App Store.

**The one thing to hold onto:** the app's value isn't the scale list. It's the
resolution solver plus the gati ladder. Build outward from that.
