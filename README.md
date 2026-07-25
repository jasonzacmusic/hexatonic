# SHADAVA — the six-note practice engine

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
C major no-4 = A minor no-b6 = **G A B C D E**, which is literally Guido
d'Arezzo's teaching hexachord from around 1025 — *ut re mi fa sol la*. Before
Western music had seven notes, it had six. **That's your thumbnail and your
title.** It also means the app stores ONE scale and rotates it, not two.

**2. The scale *is* a chord.** Stack all six notes in thirds: **Cmaj13** from C,
**Am11** from A. Nothing left over. Every note is a chord tone — because the avoid
note is the note we removed. That's the theoretical reason for the "can't play a
wrong note" feeling. It's your best line: *"the scale with no wrong notes."*

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
**srotovaha yati**. Using the real vocabulary costs nothing and makes the app
unmistakably yours.

---

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
| [docs/06-PRIOR-ART.md](docs/06-PRIOR-ART.md) | what we may and may not claim | you |
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
