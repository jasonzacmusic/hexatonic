# SHADAVA — The Theory Spine

> Everything in this document was **computed and verified** by
> `engine/shadava_theory.py`. Raw output: `engine/VERIFIED-OUTPUT.txt`.
> Machine-readable: `engine/verified.json`.
> **The production app must reproduce these tables exactly.** They are the tests.

---

## 0. The one-sentence thesis

> **A hexatonic scale is a heptatonic scale with its tritone removed.
> What's left is a single chord you cannot play a wrong note in.**

Everything else in the app is a consequence of that sentence.

---

## 1. THEOREM 1 — Why you knock off the 4th (or the 7th), and nothing else

Jason's instinct was: *"you knock off the commonly knocked-off interval — in
major, the 7th or the 4th; generally the 4th."*

That instinct is a **theorem**, not a preference. Remove each degree of C major
in turn and count the tritones in what remains:

| deg | removed | resulting scale | tritones | set class |
|-----|---------|-----------------|----------|-----------|
| 1 | C | D E F G A B | 1 | 6-33 |
| 2 | D | C E F G A B | 1 | — |
| 3 | E | C D F G A B | 1 | 6-33 |
| **4** | **F** | **C D E G A B** | **0** | **6-32 Guidonian** |
| 5 | G | C D E F A B | 1 | — |
| 6 | A | C D E F G B | 1 | — |
| **7** | **B** | **C D E F G A** | **0** | **6-32 Guidonian** |

The major scale contains **exactly one tritone: F–B**. Removing either member of
that tritone — the 4th or the 7th — and *only* those two, produces a tritone-free
hexachord. Every other removal leaves the tritone intact.

**This is why every tradition on earth independently arrived at "drop the 4" or
"drop the 7."** Gospel, bluegrass, Celtic, Carnatic, Chinese, West African.
It isn't taste. It is the only way to de-tritone a diatonic scale.

### The minor case is the same theorem
C natural minor is C D Eb F G Ab Bb. Its tritone is **D–Ab**. So the two legal
removals are **Ab (the b6)** — which is exactly what Jason specified — and **D
(the 2nd)**. Both give 6-32. His minor hexatonic and his major hexatonic are the
same theorem applied twice.

---

## 2. THEOREM 2 — There is only ONE hexatonic scale here. Store it once.

```
C major minus the 4th      = C D E G A B   → pcs {0,2,4,7,9,11}
A natural minor minus b6   = A B C D E G   → pcs {0,2,4,7,9,11}   IDENTICAL
G Guidonian hexachord      = G A B C D E   → pcs {0,2,4,7,9,11}   IDENTICAL
  (ut re mi fa sol la — Guido d'Arezzo, c. 1025)
```

**Major hexatonic and minor hexatonic are relatives, exactly like major and minor
pentatonic.** One parent set, six rotations.

> **ARCHITECTURAL CONSEQUENCE — do not miss this.**
> The app must store **one hexachord + a mode index**, never two separate
> "major hexatonic" and "minor hexatonic" scale objects. Getting this wrong at
> the data-model level makes every later feature (relative-key switching, the
> mode wheel, transposition) twice as hard and subtly inconsistent.

### The historical hook — and the version that survives scrutiny

The note-set is the hexachord Western musicians learned to sight-sing with for
centuries: Guido d'Arezzo's *ut re mi fa sol la*.

⚠️ **But do NOT say "before Western music had seven notes, it had six."** I proposed
that as the title and it does not hold up. **Stefano Mengozzi, *The Renaissance
Reform of Medieval Music Theory* (Cambridge UP, 2010)** argues that six-syllable
solmization was only ever a *sight-singing option* and never imposed "sixth-ness"
onto a diatonic system **already grounded on seven letters**; its promotion to a
fundamental structure was a later humanist reinterpretation read back onto Guido.
Also: the **Guidonian hand almost certainly post-dates Guido.**

**Safe, sourced, and still a strong hook:**

> *"For centuries Western musicians learned to sing using a six-note unit — Guido
> d'Arezzo's ut re mi fa sol la. The notes we're about to play are exactly that
> hexachord."*

The three historical hexachords: **naturale** on C (C D E F G A), **durum** on G
(G A B C D E, B♮), **molle** on F (F G A B♭ C D). Guido c. 991–after 1033;
*Micrologus* c. 1026; *Epistola* c. 1030s. Detail in `docs/08-JAZZ-GOSPEL.md §1.4`.

### Two bonus facts, both independently verified in the engine

**6-32 is one of only FIVE tritone-free hexachord set classes** out of 50 —
confirmed by enumerating all 924 six-note subsets of the aggregate. The other
tritone-free one we care about is **6-20, the augmented scale**. Our two headline
families are in a five-member club.

**`G + Am` is the UNIQUE triad pair anywhere that produces C D E G A B** —
confirmed by exhaustive search over all maj/min/aug/dim triads in all 12 keys.
(The only non-triad alternative is Gsus4 + Esus4.) That is a provable, checkable
hook and it should be a feature in the harmony module.

---

## 3. The six modes (this is the "multi-mode" requirement, done properly)

> ⚠️ **NAMING — I got this wrong at first and it is corrected here.** Do **not**
> call the no-4 collection the "gospel scale": that name means `1 2 b3 3 5 6`
> (the major blues scale). Do not call this no-4 rotation the "Sunday scale" either:
> Peter Martin/Open Studio use that name for the **no-7** collection
> `1 2 3 4 5 6`, verified in their public B-flat demonstration. And a bare "major
> hexatonic" more commonly means the **no-7** collection. Use the **modal-
> intersection** names below; they are sourced (Cecil Sharp's folk-song
> classification) and they explain themselves. Full detail: `docs/08-JAZZ-GOSPEL.md`.

| # | root | notes | degrees | 3rd? | 5th? | name to ship |
|---|------|-------|---------|------|------|--------------|
| 1 | C | C D E G A B | 1 2 3 5 6 7 | ✓ | ✓ | **Ionian/Lydian Hexatonic** — won't commit to 4 or #4 |
| 2 | D | D E G A B C | 1 2 4 5 6 b7 | **NO** | ✓ | **Sus Hexatonic** — pure quartal, no 3rd |
| 3 | E | E G A B C D | 1 b3 4 5 b6 b7 | ✓ | ✓ | **Phrygian Hexatonic** — the dark one |
| 4 | G | G A B C D E | 1 2 3 4 5 6 | ✓ | ✓ | **Ionian/Mixolydian Hexatonic** — the Guidonian hexachord |
| 5 | A | A B C D E G | 1 2 b3 4 5 b7 | ✓ | ✓ | **Dorian/Aeolian Hexatonic** — Jason's minor |
| 6 | B | B C D E G A | 1 b2 b3 4 b6 b7 | ✓ | **NO** | **Locrian Hexatonic** — no perfect 5th |

Two of these are pedagogically special and the app should say so out loud:

- **Mode 2 has no 3rd.** It is a genuinely rootless, suspended, quartal colour.
  This is the McCoy Tyner / modern-gospel stack.
- **Mode 5 (minor hexatonic) has no 6th of any kind.** The note that decides
  whether a minor scale is Dorian or Aeolian *is the note we removed*.
  **Therefore the minor hexatonic is Dorian/Aeolian-ambiguous and works over both
  m7 and m6 harmony.** That is a real, immediately usable improvising advantage
  and it should be a first-class teaching card in the app.

---

## 4. THEOREM 3 — The scale IS a chord

```
Stack C D E G A B in thirds from C:   C  E  G  B  D  A   =  Cmaj13 (no 11)
Stack the same six notes from A:      A  C  E  G  B  D   =  Am11
```

All six notes stack into one tertian chord with nothing left over.

**Every note is a chord tone. There is no avoid note — because the avoid note is
precisely the one we removed.**

⚠️ **Two precision caveats before this goes on camera:**

1. **The avoid-note doctrine is HARMONIC, not melodic.** Every source agrees the
   note is barred from *voicings and sustained melody notes* but stays fully
   available as an approach, passing or neighbour tone. Saying "you can't play the
   4th" misstates it. (Berklee: Nettles *Harmony 1* pp. 34–35; Nettles & Graf 1997;
   Mulholland & Hojnacki 2013 p. 21. **Mark Levine, *The Jazz Theory Book* p. 37**
   objects to the term itself and proposes *"handle with care" note* instead.)
2. **The major case is bulletproof; the minor case is genuinely contested.** F sits
   a half step above E, the 3rd of Cmaj7 — no one disputes that. But for b6 over
   i-7, Nettles & Graf list it as Aeolian's avoid note while **PianoGroove
   explicitly does not**, hearing it as Aeolian's defining colour. There is a live
   split on Dorian's 6th too.

> **Therefore: lead with the TRITONE argument (Theorem 1), not the avoid note.**
> Theorem 1 is arithmetic and cannot be argued with. The avoid-note framing is a
> useful second explanation, but present the minor case as *"many teachers treat the
> b6 as the avoid note over i-7; some hear it as the colour that makes Aeolian
> Aeolian."* That honesty costs nothing and protects the whole episode.

This is still the theoretical explanation for the "you can't play a wrong note"
feeling, and it is the app's core promise to the student.

---

## 5. THEOREM 4 — The available harmony is tiny (and that's the feature)

Jason predicted: *"the triads are not going to be that many, and some of them
would be inversions of each other."* Confirmed, exactly.

### C Major Hexatonic — C D E G A B

**Tertian triads — only 4:** `C` · `Am` · `Em` · `G`
→ These are **I – vi – iii – V**. The entire gospel/pop diatonic core, and
nothing else. No Dm, no Bdim — both needed the F we removed.

**Tertian 4-note chords — only 3 distinct SETS, each with two correct names:**

| pitch-class set | names |
|---|---|
| C E G A | **C6 = Am7** |
| C E G B | **Cmaj7** |
| D E G B | **Em7 = G6** |

**Sus / quartal triads — 4 more, each with three names:**
`Csus2 = Gsus4 = Dquartal` · `Dsus2 = Asus4 = Equartal` ·
`Dsus4 = Gsus2 = Aquartal` · `Esus4 = Asus2 = Bquartal`

### C Minor Hexatonic — C D Eb F G Bb

**Tertian triads — 4:** `Cm` · `Eb` · `Gm` · `Bb` (i – III – v – VII)
**Tertian 4-note sets — 3:** `Cm7 = Eb6` · `Ebmaj7` · `Gm7 = Bb6`
**Sus/quartal triads — 4**

> **ARCHITECTURAL CONSEQUENCE.**
> A chord in this app is a **pitch-class set carrying a LIST of names**, never
> "one root + one quality." `Am7` and `C6` are not two chords that happen to
> sound alike; they are one object seen from two angles, and the UI must be able
> to flip between the readings on a tap. This is the single most important data
> -model decision in the harmony module and it is also the most valuable
> teaching moment in the whole app.

Note how many **quartal** stacks exist relative to how few tertian ones. The
hexatonic is a quartal-harmony machine. That is not a shortage of chords — it is
a different harmonic language, and it's why the scale sounds modern.

---

## 6. THEOREM 5 — "Practise it in thirds" is impossible, and that's the gold

Jason: *"we need the ability to practise in thirds, but hexatonic scales won't
have thirds. They'll have some fourths."* **Exactly right.** Verified:

Stepping **2 scale degrees** ("in thirds") through C D E G A B:

```
C–E (M3)   D–G (P4)   E–A (P4)   G–B (M3)   A–C (m3)   B–D (m3)
→ 2× M3, 2× P4, 2× m3
```
versus the heptatonic, which gives a clean 3× M3 + 4× m3.

**The fourths appear exactly where the removed note left a gap.** This is the
most interesting thing about practising a six-note scale, and it is why the
drill sounds like nothing else on the instrument.

### And then the big one — "in fourths"

Stepping **3 scale degrees**:

| collection | step-3 content | all perfect? |
|---|---|---|
| pentatonic C D E G A | M3 ×1, P4 ×4 | no |
| **HEXATONIC C D E G A B** | **P5 ×3, P4 ×3** | **YES** |
| heptatonic C D E F G A B | P4 ×6, **A4 ×1** | no |
| **minor hexatonic C D Eb F G Bb** | **P4 ×3, P5 ×3** | **YES** |
| minor pentatonic | P4 ×4, M3 ×1 | no |

**Six for six. Every single degree yields a perfect fourth or a perfect fifth.**
The heptatonic *cannot* do this — F–B comes out an augmented 4th and breaks the
chain. **The note that breaks it is the note we removed.**

> This is a genuinely unique, independently checkable property and it is safe to
> state on air: **the diatonic hexachord is the only common collection that
> cycles in unbroken perfect fourths.** It makes "hexatonic in fourths" the
> cleanest quartal drill available on any instrument.

Full interval content for every cycle:

| drill | hexatonic | heptatonic |
|---|---|---|
| in 3rds (step 2) | M3×2, P4×2, m3×2 | M3×3, m3×4 |
| **in 4ths (step 3)** | **P5×3, P4×3** | P4×6, A4×1 |
| in 5ths (step 4) | M6×2, m6×2, P5×2 | P5×6, d5×1 |
| in 6ths (step 5) | m7×4, M7×1, M6×1 | M6×4, m6×3 |

(Note the honest asymmetry: **in fifths the heptatonic is the more uniform one.**
Don't overclaim. The hexatonic's unique win is specifically the fourths cycle.)

---

## 7. Set-class fingerprints — the whole hexatonic universe

| scale | notes (on C) | interval vector | tritones |
|---|---|---|---|
| **Diatonic hexachord** (all 6 modes) | C D E G A B | `<143250>` | **0** |
| Mixolydian hexatonic (no 4) | C D E G A Bb | `<143241>` | 1 |
| Harmonic minor hexatonic (no 2) | C Eb F G Ab B | `<223431>` | 1 |
| **Augmented hexatonic** (jazz) | C D# E G Ab B | `<303630>` | **0** |
| Whole tone | C D E F# G# A# | `<060603>` | 3 |
| Blues hexatonic | C Eb F Gb G Bb | `<233241>` | 1 |
| Prometheus (Scriabin) | C D E F# A Bb | `<142422>` | 2 |
| Petrushka / tritone | C Db E F# G Bb | `<224223>` | 3 |

Interval vector = `<ic1 ic2 ic3 ic4 ic5 ic6>`; the last digit is the tritone count.

**The diatonic hexachord scores `<143250>`: zero tritones and five perfect
fourths/fifths** — the most consonant and most quartal six-note set that exists.
The augmented hexatonic is the other tritone-free one, but it gets there by
symmetry (3 major + 3 minor triads inside it) rather than by consonance.

---

## 8. Multi-key: correct spelling in all twelve

Verified — no repeated letters, no triple accidentals, VexFlow-ready:

```
C  → C  D  E  G  A  B          Db → Db Eb F  Ab Bb C
G  → G  A  B  D  E  F#         Ab → Ab Bb C  Eb F  G
D  → D  E  F# A  B  C#         Eb → Eb F  G  Bb C  D
A  → A  B  C# E  F# G#         Bb → Bb C  D  F  G  A
E  → E  F# G# B  C# D#         F  → F  G  A  C  D  E
B  → B  C# D# F# G# A#
F# → F# G# A# C# D# E#
```

**The spelling rule that makes this work:** a note is `(letter, alteration,
octave)` — never a MIDI integer. Build the parent 7-note scale first with one
letter per degree, *then* remove the omitted degree. Removing first and
re-spelling afterwards is how every other scale app ends up printing `E#` where
`F` belongs. See `Note` and `build_diatonic_scale()` in the engine.

---

## 9. Where this goes next (same engine, no rewrite)

The engine is already size-agnostic. The roadmap is a data question, not an
architecture question:

- **Audava (5) — pentatonic.** Remove two notes. Same omission machinery.
- **Shadava (6) — hexatonic.** Shipping first.
- **Sampurna (7) — heptatonic.** The parent scales, already modelled.
- **Octatonic (8).** Two distinct families that must not be conflated:
  - the **symmetric diminished** scales (whole–half, half–whole);
  - **Barry Harris's "sixth diminished" scales** — a major/minor/dominant 6th
    chord interleaved with a diminished 7th, which is a *harmonic* device for
    generating drop-2 voicing movement, not merely a scale. These deserve their
    own module and their own vocabulary; do not file them under "scales."

The `omit_degree` / `steps` model covers 5, 6 and 7 with no code changes —
verified in the engine (`ROADMAP PROOF 2`):

```
Audava (5)    C D E G A       iv=<032140>  0 tritones
Shadava (6)   C D E G A B     iv=<143250>  0 tritones
Sampurna (7)  C D E F G A B   iv=<254361>  1 tritone
```

**Triad pairs also fall out free** (`ROADMAP PROOF 1`). Any two triads with no
shared notes generate a hexatonic: C+D (whole step) is the Weiskopf/Campbell
workhorse, C+F# (tritone) is the Petrushka set, C+Db sits inside the augmented
family. One function generates all of them, so the jazz triad-pair feature is
**data, not new architecture.**

### ⚠️ One real constraint discovered — read this before building octatonic

**Eight notes will not fit in seven letters, so exactly one letter must repeat —
and which one cannot be fixed globally.** A letter template that spells C
octatonic cleanly (`C D Eb F Gb Ab A B`) gives **Eb a double flat** (`Bbb`).

The correct algorithm, now implemented in `octatonic()`:
1. try every legal position for the doubled letter;
2. score each candidate by `sum(alt²)` so double accidentals are punished hard;
3. **tie-break towards the key's own accidental direction** — flat keys spell
   `Gb`, sharp keys spell `F#`. Without step 3 the tie resolves arbitrarily and
   you get sharps in flat keys.

Verified: **0 of 24 root/kind combinations need a double accidental.** Some roots
still come out with *mixed* accidentals (`Ab` whole-half = `Ab Bb B C# D E F G`)
— that is an unavoidable property of a symmetric scale, not a bug, and the app
should not try to "fix" it.

### Barry Harris — the corrected facts (I first wrote "three"; there are four)

Each is a chord interlocked with the diminished 7th on its **major-7th degree**:

| name | chord | scale on C |
|---|---|---|
| Major Sixth Diminished | C6 | C D E F G **Ab** A B |
| Minor Sixth Diminished | Cm6 | C D Eb F G **Ab** A B |
| Seventh Diminished | C7 | C D E F G **Ab** Bb B |
| Seventh Flat Five Diminished | C7b5 | C D E F Gb Ab Bb B |

- **The dominant scale uses Ab.** `C D E F G A Bb B` is the **bebop dominant scale**
  and is *not* a sixth-diminished scale — its alternate notes give Bm7b5, which is
  half-diminished and cannot interleave.
- **Never call these "octatonic."** They are eight-note but provably *not* the
  symmetric diminished scale (which has 3 transpositions; these have 12). Say
  "eight-note."
- **There is no "major 7th diminished scale"** — that phrase names a *chord*.
- **"Sixth" refers purely to the sixth CHORD. There is no six-note collection
  anywhere in Barry's system.** That is exactly why his method keeps getting
  mis-filed under hexatonics; kill the confusion on sight.

It needs a genuine **harmony** engine, not a scale list. **Ship 6 first, prove the
loop, then widen.** Full sourcing in `docs/08-JAZZ-GOSPEL.md §1.6`.
