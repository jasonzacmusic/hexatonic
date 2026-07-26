# Hexatonic — the complete roadmap

**Purpose of this file:** Jason described a lot of features in the original
conversation that are not yet built. This is the durable record so that any
future session — Codex, Claude Code, another machine, another year — can pick up
without him having to remember and re-explain.

Status key: **✅ built** · **🟡 partial** · **⬜ not built**

---

## 1. Everything Jason asked for, in his own framing

Taken from the original brief and the follow-ups, in the order he raised them.

| # | What he asked for | Status | Where it is / what's missing |
|---|---|---|---|
| 1 | "Study and practise hexatonic skills" | ✅ | `/practice` |
| 2 | "Take a major hexatonic as well as a minor hexatonic" | ✅ | modes 0 and 4 of the diatonic hexachord |
| 3 | "Knock off the commonly knocked-off interval from the hepta" | ✅ | `hexatonicByOmission`, and it turned out to be a theorem |
| 4 | "Multi-key, multi-mode, multi-scale" | ✅ | 12 keys × 6 modes × 7 families |
| 5 | "Practise together live, ideally in a YouTube live shoot" | 🟡 | `/live` exists; the shoot itself is planned in `04-YOUTUBE-LIVE.md` but nothing is recorded |
| 6 | "Aroha, Avaroha" | ✅ | patterns `aroha`, `avaroha`, `both` |
| 7 | "Accents of threes, fours, fives, sixes, sevens" | ✅ | groupings 3–9 with the resolution solver |
| 8 | "One octave or two octaves" | ✅ | 1–3 octaves |
| 9 | "Such that a time signature is respected… resolves at the one of the next bar" | ✅ | `solveResolution`, accent and full modes |
| 10 | "Practise in thirds, but hexatonic scales won't have thirds — they'll have some fourths" | ✅ | verified exactly right; `thirds`/`fourths`/`fifths`/`sixths` |
| 11 | "The available triads should be very, very critical" | ✅ | harmony panel, chord-as-set with a name list |
| 12 | "Some of them would be inversions of each other" | ✅ | confirmed — C6 = Am7, Em7 = G6, tap to flip |
| 13 | "Simplified to pentatonic and heptatonic" | 🟡 | families exist (Audava 5 / Sampurna 7) but they are not first-class *modules* with their own teaching |
| 14 | **"The beauty of the hexatonic — the gospel usage, the improvisational usage for jazz musicians"** | ✅ | **BUILT 2026-07-25** — `/improvise`: eight vamps built only from the scale's own harmony, four voicing styles, bass/comp toggles, guide tones. Still missing: a lick library and recorded backing tracks. |
| 15 | **"Barry Harris's octatonic scales and other octatonic scales"** | ⬜ | not built. See §3 — this needs a *harmony* engine, not another scale list |
| 16 | "Future: pentatonic, heptatonic and octatonic as well" | 🟡 | 5 and 7 partial, 8 absent |
| 17 | "World's first hexatonic scale app" | ❌ | **false and abandoned.** See `06-PRIOR-ART.md` |

---

## 2. Tier 1 — highest value per unit of effort

Do these first. Each one multiplies what already exists.

### 2.1 ⬜ MIDI input and grading
The engine already knows the expected note at every tick. Accept Web MIDI, compare
what was played against the drill, and report which notes *and which accents* were
missed. This converts a display into a teacher and is the single highest-value
addition on the list.

### 2.2 ✅ Improvisation mode — BUILT. What remains: a lick library per mode, and richer feels/drums.
Jason asked for this explicitly and it is entirely missing. Minimum useful version:
- a **drone** on the tonic, and a **vamp** per mode (Am11 loop, gospel 6/8, quartal pad)
- **"blow over this"** — the ring and keyboard stay lit with the available notes while
  a progression cycles, so the student improvises rather than runs patterns
- the four available triads shown as **voicings**, not just labels
- a small **lick library** in each mode, notated and playable

⚠️ Content caution: no published repertoire analysis of the no-4 collection in gospel
exists. Present musical examples as **Jason's own pedagogy**, never as cited analysis.
See `08-JAZZ-GOSPEL.md §7`.

### 2.3 ⬜ Print / PDF export
Any drill, any key, as a clean page of engraving. Teachers will use this weekly and
it makes the app useful away from a screen. VexFlow already renders the SVG.

### 2.4 ⬜ Assignment sheets from drill links
Drill links already work. Wrap them: a teacher picks six drills, gets one page with
six links and a printable summary. Directly useful for Music Gym and private lessons.

### 2.5 🟡 Kala pramanam — three speeds as a first-class axis
The tradition practises every exercise at ×1, ×2, ×4. Right now tempo is a slider.
Make speed-doubling a real control with a locked relationship, because that is how
students actually gear up. Constants are already in `resolution.ts`.

---

## 3. Tier 2 — the differentiators

### 3.1 ⬜ Triad-pair generator (the jazz route in)
`chords.ts` already exports `triadPair()` and `augmentedPair()` with the validation
rules. There is **no UI**. Build it: pick any two triads, get the hexatonic they
generate, its modes, its available harmony, and the parent scales it fits.

Facts already proven and worth surfacing:
- two **major** triads share no tone at only three interval classes — semitone,
  whole step, tritone. So **C major + E♭ major is not a valid pair** (they share G).
- the **augmented-triad parity rule** is complete: same parity → whole-tone,
  opposite parity → augmented hexatonic. No other outcome is possible.
- **G + Am is the unique triad pair** anywhere producing C D E G A B.

Credit properly: Weiskopf *Intervalic Improvisation* (1995 — one L), Campbell
*Triad Pairs for Jazz* (Alfred 2001), Bergonzi *Hexatonics* (Advance).

### 3.2 ⬜ Raga mode — the feature nobody can copy
Load real **shadava** ragas with aroha and avaroha that *differ*, plus vakra motion.
`07-CARNATIC.md §3` has a verified dataset ready to use: Pushpalathika, Sriranjani,
Malayamarutham, Nalinakanthi, Devamanohari, Marwa, Puriya, Gaudgiri Malhar, and the
compound (shadava-sampurna) set.

**Data-model change required:** a scale currently has ONE note list. Ragas need
separate ascending and descending forms, and vakra means the line is not monotonic.
Model it as an explicit degree sequence per direction.

⚠️ Ship the UNVERIFIED list from `07-CARNATIC.md §7` as caveats, not as facts. And
Sriranjani is **panchama-varjya** — it is not the minor hexatonic.

### 3.3 ⬜ The varisai curriculum ladder
Model the app's progression on the real system rather than an invented one:
**Sarali → Melsthayi → Mandrasthayi → Janta (doubled) → Dhatu (zigzag permutations)
→ Alankaram (across talas)**. The structural insight worth stealing: levels 1–5 hold
the raga constant and vary the *pattern*; Alankaram holds the pattern and varies the
*tala*. **Permute, then re-tala.** Detail in `07-CARNATIC.md §6`.

### 3.4 ⬜ Talas beyond 4/4
`/resolution` already accepts any beats-per-bar, but the **drill itself is hard-wired
to 4/4**. Add the sapta talas (Dhruva, Matya, Rupaka, Jhampa, Triputa, Ata, Eka) with
their jati variants. ⚠️ The akshara counts in `07-CARNATIC.md §C3` are *computed, not
sourced* — verify against a printed text before displaying them.

### 3.5 ⬜ Eduppu — off-samam starts
Support **sama** (on beat 1), **atita** (before) and **anagata** (after) phrase starts.
⚠️ Atita and anagata are **reversed in some published sources**; the correct assignment
and the etymology that settles it are in `07-CARNATIC.md §4.5`.

### 3.6 ⬜ Korvai calculator
The tradition's own version of the resolution solver: fix the total subunits to samam,
split into purvangam and uttarangam each built from 3× (phrase + karvai), absorb
remainders into the karvai rather than the phrase, build phrases from 3/4/5/7/9.
Worked examples in `07-CARNATIC.md §5`.

### 3.7 ⬜ Konnakol audio
The syllables are in the app as text. Speak them. Recorded or synthesised, one set,
one romanisation convention held consistently.

### 3.8 ⬜ Two-player / duet mode
One player in 5s, one in 7s, both resolving on the same bar. The solver already
computes when that happens. Spectacular on a live stream and trivially derived from
existing code.

### 3.9 🟡 Yati ladder as a real sequence
`/live` has a manual stepper. Make it automatic: run 3→4→5→6→7 back to back, each
segment resolving before the next begins, with a visible countdown between them.
That is **srotovaha yati** and it is the centrepiece of the planned episode.

---

## 4. Tier 3 — the expansion the name promises

### 4.1 ⬜ Audava (5) and Sampurna (7) as real modules
They exist as scale families. They do not have their own teaching, their own theorems,
or their own interval-cycle stories. A pentatonic module should say what a pentatonic
*is* — two omissions, no semitones at all, and its own set of available harmony.

### 4.2 ⬜ Octatonic (8) — symmetric diminished first
Whole-half and half-whole. The engine has `octatonic()` in the Python reference with
a solved spelling problem worth porting:

> Eight notes will not fit in seven letters, so exactly one letter must repeat — and
> **which one cannot be fixed globally.** A template that spells C cleanly gives E♭ a
> double flat. The correct algorithm tries every position for the doubled letter,
> scores by `sum(alt²)`, and tie-breaks toward the key's own accidental direction.
> Verified: 0 of 24 root/kind combinations need a double accidental.

### 4.3 ⬜ Barry Harris module (feature 15) — do this properly or not at all
**This is a harmony engine, not a scale list.** Getting it wrong is worse than not
shipping it, because his method is mangled everywhere online.

The verified facts (full sourcing in `08-JAZZ-GOSPEL.md §1.6`):
- There are **FOUR** sixth-diminished scales, not three. Each is a chord interlocked
  with the diminished 7th on its **major-7th degree**:

  | name | chord | scale on C |
  |---|---|---|
  | Major Sixth Diminished | C6 | C D E F G **A♭** A B |
  | Minor Sixth Diminished | Cm6 | C D E♭ F G **A♭** A B |
  | Seventh Diminished | C7 | C D E F G **A♭** B♭ B |
  | Seventh Flat Five Diminished | C7♭5 | C D E F G♭ A♭ B♭ B |

- **The dominant one uses A♭.** `C D E F G A B♭ B` is the **bebop dominant scale** and
  is *not* a sixth-diminished scale — its alternate notes give Bm7♭5, which is
  half-diminished and cannot interleave.
- **Never call these "octatonic."** They are eight-note but provably *not* the
  symmetric diminished scale (3 transpositions vs 12). Say "eight-note".
- **There is no "major 7th diminished scale"** — that phrase names a *chord*.
- **"Sixth" refers purely to the sixth CHORD. There is no six-note collection anywhere
  in Barry's system.** This is exactly why his method keeps getting mis-filed under
  hexatonics — kill that confusion on sight.
- The real feature is the **movement**: harmonise every degree in four parts and you
  get two chords alternating through inversions, with every voice moving by one scale
  step in the same direction. Barry called it "6th–6th–6th" instead of "II–V–I".
  **"Borrowed notes"** is his own term (a maj7 is a 6th chord with one note borrowed
  from its diminished). **"The family"** is his term for the four dominants sharing one
  diminished. Attribute drop-voicing language to **Kingstone**, not to Barry.

### 4.4 ⬜ Instrument packs
Guitar and bass fretboards, wind fingerings, vocal ranges. The fourths cycle is a
different revelation on each instrument, and this is what widens the audience past
pianists.

### 4.5 ⬜ Neo-Riemannian module (long shot, genuinely interesting)
Cohn's four hexatonic systems and hexatonic poles. `08-JAZZ-GOSPEL.md §8` has the
verified PL cycles. ⚠️ Only **Western = Hex(2,3)** is directly sourced; Northern vs
Southern could not be determined — do not assign those two.

---

## 5. Known issues and technical debt

Honest list, for whoever audits next.

| Area | Issue |
|---|---|
| **Meter** | The drill is hard-wired to 4/4 even though `solveResolution` accepts any meter. Biggest functional gap. |
| **Notation** | Display caps at 24 bars; playback runs the full drill. A 35-bar drill shows a partial score. |
| **Performance** | A long drill builds a large `notes` array and re-renders the whole score on any change. No virtualisation or memoisation of the VexFlow render. |
| **Testing** | 56 tests cover the **theory engine only**. Zero component tests, no E2E, no visual regression. The audio scheduler is untested in the repo (it was verified once by hand with a fake clock). |
| **Accessibility** | Never audited. Colour contrast on `muted` text over `surface` is likely below AA. The ring conveys information by colour alone. Keyboard traps unknown. |
| **Service worker** | `CACHE = "hexatonic-v1"` is a hardcoded constant — **it must be bumped on every deploy** or returning users get stale assets. Should be build-stamped. |
| **`transpose`** | Exists in state, fixed at +1 octave, no UI. Either expose it or remove it. |
| **CI** | No GitHub Actions. `npm test` and `npm run build` should gate every push. |
| **`prototype/`** | The original single-file prototype is still in the repo. Superseded; keep for reference or delete deliberately. |
| **Fonts** | Loaded from Google Fonts over the network, so the offline PWA falls back to system fonts. Self-host to fix. |
| **OG image** | Uses the edge runtime, which disables static generation for that one route. Harmless but noted in the build output. |
| **Mobile** | Verified for overflow only. The control density on `/practice` is desktop-first and deserves a real mobile pass. |
| **No analytics** | No idea which drills people actually use. |

---

## 6. Content still to write

- **Per-mode teaching** for the modes that currently have one line.
- **"Where you've heard this."** ⚠️ Careful — no repertoire analysis of the no-4
  collection in gospel exists. What *is* citable: Oliver Nelson's **"Hoe-Down"**
  (the bridge, a composed line — *not* a "Stolen Moments" solo), Michael Brecker on
  *Straphangin'* / *Fawlty Tenors* / *Everything Happens When You're Gone* / *Timeline*,
  Jerry Bergonzi on *Creature Feature*, and Liszt's *A Faust Symphony* opening.
  **Do not** name Woody Shaw — refuted outright.
- **The Guido history**, in the safe form: for centuries musicians learned to sing on
  a six-note unit. **Not** "music had six notes before seven" — that is false.
- **A one-page "how to teach with this"** for the Music Gym.

---

## 7. Naming and claims — the permanent guardrails

These were all got wrong once and corrected. Do not re-derive them wrong.

1. **Never "world's first."** An iOS app named *Hexatonics* shipped January 2025;
   mDecks Tessitura Pro has taught bi-triadic hexatonics since 2017. Safe claim:
   *"the only free, browser-based app built entirely around hexatonic practice."*
2. **Never "gospel scale"** for this collection — that name means `1 2 ♭3 3 5 6`, the
   major blues scale.
3. **Never "Sunday scale"** — that is Peter Martin's term for a different, unverified
   six-note scale.
4. **Never a bare "major hexatonic"** — ambiguous; it usually means the *no-7* one.
5. **Use the modal-intersection names**: Ionian/Lydian, Ionian/Mixolydian, Dorian/
   Aeolian. Sourced to Cecil Sharp's folk-song classification, and they explain the
   ambiguity the removed note creates.
6. **The avoid-note doctrine is harmonic, not melodic** — barred from voicings and long
   notes, fine as a passing tone. And ♭6-over-minor is genuinely contested. **Lead with
   the tritone argument**, which is arithmetic and cannot be argued with.
7. **The one superlative that survives**, if one is wanted:
   *"the first tool that generates melodic patterns in Carnatic groupings — tisra,
   chatusra, khanda, misra — and tells you exactly which bar they resolve on."*
   Verified: no such generator exists in either the Western or the Carnatic market.
