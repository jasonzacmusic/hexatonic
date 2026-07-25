# SHADAVA — The YouTube Live Plan

> Goal: a live, play-along practice session where Jason and the NSM team drill
> hexatonic scales together with the app on screen as the conductor — and the
> audience plays along in real time.

---

## 1. Why this works as a live, not a tutorial

Most theory videos are watched. **This one is done.** The app generates the drill,
the resolution banner tells everyone exactly when it lands, and the whole
audience is doing the same 5-bar cycle at the same tempo. That is a genuinely
different viewing experience and it is the reason to go live rather than record.

The hexatonic is the right vehicle because of the arithmetic (see
`docs/03-RHYTHM-ENGINE.md §3`): **it resolves 2–7× faster than the major scale in
every grouping.** A live audience can actually land a 5-bar cycle together.
They cannot land a 35-bar one. **The scale choice is what makes the format
possible** — say that on air.

---

## 2. The trifecta (title · thumbnail · intro)

### Title candidates — congruent set

| # | title | angle |
|---|---|---|
| 1 | **The Scale With No Wrong Notes (and why nobody teaches it)** | curiosity + benefit |
| 2 | **Delete One Note. Your Playing Changes Forever.** | mechanism, punchy |
| 3 | **Why Gospel Players Never Play The 4th** | tribe-specific, high CTR |
| 4 | **6 Notes Beat 7. Here's The Math.** | contrarian + proof |
| 5 | **Before Music Had 7 Notes, It Had 6** | history hook |

**Recommendation: #1 as the live title, #3 as the Shorts/Reels cut, #5 as the
evergreen re-upload title** if you later cut the live into a tutorial. #1 makes a
promise the theory actually keeps — Theorem 3 proves there are no avoid notes —
so it is not clickbait, which matters for a channel built on trust.

### Thumbnail concept
Coloured (normal episode, not Free Style). **A piano keyboard with exactly one key
struck out in red** — the 4th — and the number **6** as the hero element in NSM's
type. Jason's face at right, one eyebrow, no open-mouth shock. The struck-out key
*is* the whole idea; if a viewer understands the thumbnail they already
understand the video.

A full Claude Design brief for this is in `docs/DESIGN-BRIEF-THUMBNAIL.md`.

> **DO NOT say "world's first hexatonic app" on air.** It is false — there is an
> iOS app literally called *Hexatonics*, and mDecks Tessitura Pro has shipped
> bi-triadic hexatonic practice since 2017. See `docs/06-PRIOR-ART.md`. Lead with
> the **theorem** instead; arithmetic cannot be rebutted with a link.

### Intro — first 30 seconds (spoken, Jason's voice)
> "There's one note in the major scale that's fighting you. Just one. It's the
> reason your lines sound like exercises instead of music. Today we're going to
> take it out — and then we're going to practise together, live, all of us, in
> the same groove, and I'm going to show you the maths for why six notes land on
> the beat and seven notes don't. Get your instrument. This one is not a video
> you watch."

---

## 3. Run of show — 75 minutes

| # | min | segment | on screen | who |
|---|---|---|---|---|
| 0 | −10 | Waiting room loop: the resolution grid animating, tempo 84 | `/resolution` | — |
| 1 | 0–3 | **Hook + promise.** Play a line with the 4th, then without. Same lick. | Jason at piano | Jason |
| 2 | 3–10 | **Theorem 1 live.** Remove each note of C major on screen; the tritone counter hits zero only twice. | `/learn` card 1 | Jason |
| 3 | 10–16 | **Theorem 2.** Major-no-4 = minor-no-b6 = Guido's hexachord. One set, six modes. | `/scales` mode wheel | Jason |
| 4 | 16–22 | **Theorem 3 — "it IS a chord."** Stack the six notes: Cmaj13 / Am11. Team plays the stack. | keyboard + guitar | Jason + 1 |
| 5 | 22–30 | **WARM-UP DRILL — aroha/avaroha, 1 octave, chatusra (4s), 84bpm.** Everyone plays. 3-bar resolution. | `/live` | ALL |
| 6 | 30–38 | **Theorem 5 — in thirds.** Hear the fourths appear. Then in fourths: six perfect intervals in a row. A/B against the major scale's augmented 4th. | `/learn` card 5 | Jason |
| 7 | 38–48 | **THE YATI LADDER.** 3 → 4 → 5 → 6 → 7, each resolving before the next. This is the centrepiece. | `/live` | ALL |
| 8 | 48–56 | **Modal tour.** Same six notes, six tonics. Team member per mode. Land on the sus mode (no 3rd) and the ambiguous minor. | `/scales` | team |
| 9 | 56–64 | **Improvise.** Free blowing over an Am11 vamp, hexatonic only. Round-robin, 8 bars each. | vamp | ALL |
| 10 | 64–70 | **Q&A / requests.** Take a key from chat, load it live, play it. | `/practice` | Jason |
| 11 | 70–75 | **CTA.** App link, next public class, subscribe. | end card | Jason |

**Segment 7 is the episode.** If you run short on time, cut 8 and 10, never 7.

### The play-along contract (say it at minute 22 and pin it)
> "Tempo 84. One octave. We start on the click, we accent in groups, and we all
> land on the '1' of bar 4 together. If you fall off, wait for the next bar 1 and
> jump back in. Nobody stops."

---

## 4. Team roles

| role | job | notes |
|---|---|---|
| **Jason Zac** | teach, play, drive the app | on camera, at the piano |
| **App driver** | operate `/live` — load presets, hit play, keep tempo | **must not be Jason.** He cannot teach and drive simultaneously. Give this person the keyboard-shortcut sheet and one rehearsal. |
| **Second instrumentalist** (guitar / bass / wind) | prove it's not a piano trick | the "in fourths" cycle is spectacular on guitar and bass |
| **Vocalist** | sing the hexatonic on solfège | this is the Guido d'Arezzo callback made literal — *ut re mi fa sol la* on the actual hexachord |
| **Chat moderator** | surface key requests, pin the play-along contract, drop links | also collects the questions for segment 10 |
| **Stream tech** | OBS scenes, audio levels, the app window as a source | pre-flight checklist below |

---

## 5. Pre-flight checklist (do this the day before, not on the day)

- [ ] `/live` loaded in a **dedicated browser window**, correct zoom, offline-tested
- [ ] Every preset chip tapped once and confirmed — **no 21-bar drills in the set**
- [ ] Tempo agreed and locked (84 for warm-up, 96 for the ladder)
- [ ] Metronome routed so the audience hears it but it doesn't swamp the piano
- [ ] App audio and piano audio on separate faders
- [ ] OBS scene per segment; app window is a captured source, not a shared screen
- [ ] Notation legible at 1080p on a phone — **check on an actual phone**
- [ ] The app driver has rehearsed the ladder once, end to end
- [ ] Fallback: if the app dies, a printed PDF of every drill is on the piano

---

## 6. Promo ladder

**T−7 days** — Instagram carousel: "One note is ruining your lines." Slide 1 the
struck-out key; slides 2–5 the theorem; slide 6 the live date.
**T−5** — YouTube Community post with the resolution grid image and the question
*"why do 6 notes land on the beat and 7 don't?"*
**T−3** — Reel: 20 seconds of the fourths cycle on piano vs. the major scale's
augmented 4th. Pure audio payoff, no talking.
**T−1** — Brevo email to the list: "Bring your instrument tomorrow."
**T−2 hours** — WhatsApp to students and the Music Gym group.
**T+0** — go live.
**T+1 day** — Shorts cut: the ghost-note reveal. Title *"Why Gospel Players Never
Play The 4th."*
**T+3 days** — the app link as its own post; the `/resolution` calculator is the
shareable, link-worthy artefact.

All of this should be built with `/nsm-launch` and `/nsm-trifecta` once the shoot
date is set; hashtags via `/nsm-hashtags` (live counts, not guesses).

---

## 7. Taking the app to the next level

Ordered by *value per unit of effort*, honestly assessed.

### Tier 1 — do these next, they're cheap and they multiply the app
1. **MIDI input + grading.** Play the drill; the app tells you which notes and
   which *accents* you missed. The engine already knows the expected note at
   every tick. This turns a display into a teacher and it is the single highest-
   value addition.
2. **Shareable drill links → assignment sheets.** Jason posts a link, students
   arrive on the exact configuration. Zero-cost, immediately useful for Music
   Gym and private lessons.
3. **The `/resolution` calculator as a standalone SEO page.** Useful to any
   musician on any scale. It will out-rank the app itself and funnel inward.
4. **Print/PDF export** of any drill in any key. Teachers will use this weekly,
   and it makes the app useful without a screen.

### Tier 2 — the differentiators
5. **Triad-pair generator** (Weiskopf/Campbell territory): pick any two triads,
   get the hexatonic they generate, plus its modes and available harmony. This
   makes the app the definitive jazz hexatonic tool, and it falls out of the
   existing set-analysis code almost free.
6. **Raga mode.** Load real **shadava** ragas with aroha/avaroha that differ, plus
   vakra motion. This is the feature no Western app can copy and it is
   authentically Jason's territory.
7. **Backing tracks per mode** — an Am11 vamp, a gospel 6/8, a modal quartal
   pad. Practising against a drone or vamp is how this scale is actually used.
8. **Two-hand / two-player mode** for the live format: one player in 5s, one in
   7s, both resolving on the same bar. The resolution solver already computes
   when that happens. This is a spectacular live demo.

### Tier 3 — the expansion the name already promises
9. **Audava (5)** and **Sampurna (7)** modules. Same engine, more data.
10. **Octatonic (8)** — symmetric diminished first, then a proper **Barry Harris**
    module built as a *harmony* engine (sixth-diminished scales, drop-2 movement),
    not as another scale list. Do not rush this one; doing Barry Harris badly is
    worse than not doing it.
11. **Instrument packs** — guitar/bass fretboards, wind fingerings, voice ranges.
    The fourths cycle is a different revelation on each instrument.

### The honest strategic read
The app's moat is **not** the scale library — anyone can list scales. The moat is
the **resolution solver plus the Carnatic grouping ladder**, because that
combination is genuinely unavailable anywhere and it is defensible pedagogy
rather than content. Build outward from that, not from the scale dictionary.
