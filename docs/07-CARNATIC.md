# SHADAVA — The Carnatic Layer (verified)

> Researched and cross-checked against cited sources. **Items marked
> ⚠️ UNVERIFIED must not be stated as fact on air or in the app.**
> This document exists because Indian musicians will spot an error instantly, and
> a wrong konnakol syllable or a swapped yati would undo the app's credibility in
> one comment.

---

## 1. THE HEADLINE — both of Jason's scales have real raga names

### Minor hexatonic (C D Eb F G Bb) = **PUSHPALATHIKA** ✅ solidly verified

| | |
|---|---|
| **Raga** | Pushpalathika (also Pushpalatha, Palasi, Kalindi) |
| **Arohana** | `S R2 G2 M1 P N2 S` |
| **Avarohana** | `S N2 P M1 G2 R2 S` |
| **Parent** | mela 22 **Kharaharapriya** |
| **Omitted** | **dhaivata-varjya** (no Dha) |
| **Jati** | shadava-shadava — six notes **both** directions, straight, no vakra |
| **Hindustani twin** | **Gaudgiri Malhar** (`S R g m P n` both ways, dhaivat varjit) — identical pitch set |

Dr M. Radhakrishnan's *Rare Raga Series* derives it **exactly the way Jason did**:

> *"Pushpalathika can be obtained by taking Manirangu and using the same notes in
> the avarohanam for arohanam also, or by adding G2 to both arohanam and
> avarohanam of Madhyamavathi."*

He also notes it is *"a very rare ragam; only few compositions; seldom heard in
concerts"* — first composed in by Swathi Thirunal.

> **This is a genuine gift for the episode.** Jason derived a raga from first
> principles by removing the tritone, and it turns out to be a real, named,
> documented Carnatic raga with royal-composer repertoire. Say that on air.

### Major hexatonic (C D E G A B) — thinner, be careful

| candidate | tradition | status |
|---|---|---|
| **Ānandharoopa** / **Suranandini** | Carnatic, janya of mela 29 Dhirasankarabharanam, **madhyama-varjya**, shadava-shadava | ⚠️ **verified-but-thin.** Appears in Wikipedia's *List of Janya ragas* and Raga Of The Week (ids 11493/11542, which independently prints `C D E G A B`), but **no Wikipedia article, no Raga Surabhi entry, no concert repertoire found.** No print-grade authority. |
| **Raga Shankara** | Hindustani, Bilawal thaat, **madhyam totally varjit**, all shuddha swaras | ✅ first-rank raga, and the **note-set matches exactly** — but its *shape* does not: aroha `S G P N D S'` skips Re, and **Re is durbal (extremely weak)**. Wikipedia calls it audav-shadav. Vadi G, samvadi N. |
| **Kesari Kalyan** | Hindustani, `S R G P D N S'` / `S' N D P G R S`, shadav-shadav | ✅ literally the symmetric scale — **but composed by Pt. Ramashreya Jha 'Ramrang' in the 2000s and is *aprachalit*** (outside standard repertoire). |

**Honest verdict: there is no mainstream, commonly-performed raga whose scale is
exactly C D E G A B in both directions.** Safe copy:

> *"The note-set is Raga Shankara (Hindustani, madhyam varjit). As a straight
> symmetric scale it's Ānandharoopa in the Carnatic system — mela 29, and very
> rare."*

**Every other candidate is ruled out** — checked and eliminated: Bilahari is
audava-**sampurna** (descent has all 7 including F); Kedaram is D-varjya not
M-varjya; Nagaswaravali, Shuddha Saveri, Deshkar, Bhupali and Hamsadhwani are all
**pentatonic**; Kambhoji has F; Sarasangi is a full melakarta with Ab.

### 🔴 One trap to avoid saying
**Sriranjani is NOT the minor hexatonic.** It is **panchama-varjya** — the exact
opposite: `S R2 G2 M1 D2 N2 S`, which **has A and lacks G**. Wikipedia is explicit:
*"Shree ranjani is a symmetric scale that does not contain panchamam."* Getting
this backwards is precisely the error a rasika would pounce on.

### A nice teaching pairing
Both scales are **"pentatonic + 1"**: the major hexatonic is major pentatonic **+
the 7th**; the minor hexatonic is minor pentatonic **+ the 2nd**. And each has a
Carnatic name *and* a Hindustani equivalent with an identical pitch set —
Pushpalathika ≡ Gaudgiri Malhar; Ānandharoopa ≡ Shankara's swara-set.

---

## 2. Terminology — the classification system

| notes | Sanskrit | Devanagari | variants in print |
|---|---|---|---|
| 5 | auḍava | औडव | audava, **oudava**, audhava |
| **6** | **ṣāḍava** | **षाडव** | **shadava**, shaadava, **shaudava** |
| 7 | saṃpūrṇa | सम्पूर्ण | sampurna, sampoorna, **sampooran** |

*(Devanagari is standard Sanskrit orthography from lexical knowledge, **not**
transcribed from a Devanagari-script source. High confidence, unaudited.)*

Etymology worth teaching: *ṣāḍava* ← *ṣaṭ* (six); *saṃpūrṇa* = "complete."
Ragopedia prints "Shaudava" and "Sampooran" — those spellings are legitimate in
circulation, not typos.

### ⚠️ NAMING TRAP — read before writing UI copy
**"Jati" is overloaded three ways** in Carnatic theory: (1) the raga note-count
class above; (2) the *laghu* count in a tala (tisra/chatusra/…); (3) mridangam
syllable groupings. **Meaning (2) is what most Indian musicians reach for first.**
So label the app's field **"jati (raga)"** or just **"shadava"** — never a bare
"jati: shadava", which is correct but invites an argument.

### Varjya — all three forms are real
| form | Devanagari | usage |
|---|---|---|
| **varjya** | वर्ज्य | **Carnatic default** — "panchama varjya" |
| **varja** | वर्ज | the category — "varja ragas" |
| **varjit / varjita** | वर्जित | **Hindustani default** — "pancham varjit" |

Construction: `<swara stem> + varjya` → madhyama-varjya, dhaivata-varjya, etc.
Carnatic pedagogy also uses Tamil/Telugu `-m` forms: *"panchamam varjyam"*.
Note the official definition allows **up to three** deleted notes.

### The nine compound jatis — arohana first
```
Sampurna-Sampurna   Sampurna-Shadava   Sampurna-Audava
Shadava-Sampurna    Shadava-Shadava    Shadava-Audava
Audava-Sampurna     Audava-Shadava     Audava-Audava
```
So **Shadava-Sampurna = 6 up / 7 down.** Asymmetry is the *norm* in janya ragas,
not the exception — the app's data model must allow different aroha and avaroha.

Also: **arohana** आरोहण (Carnatic *arohanam*, Hindustani *aroha* आरोह) and
**avarohana** अवरोहण (*avarohanam* / *avaroha*). Use the Carnatic `-m` forms in
Carnatic contexts and the shorter Hindustani forms in Hindustani contexts —
**do not mix within one screen.**

**Vakra** वक्र = crooked. Precision point that earns credibility: the technical
criterion is **note repetition inside the scale line**, not merely
non-monotonic motion. Kedaram's `S M1 G3 M1 P N3 S` is vakra because **M1
literally repeats**.

Two further axes worth supporting later: **Varja Krama** (omitted, straight) vs
**Varja Vakra** (omitted, zigzag); and **Upanga** (parent notes only) vs
**Bhashanga** (borrows *anya swara*). Bhashanga matters — Kambhoji and Bilahari
are both bhashanga, so a strict scale display will look wrong to a rasika.

---

## 3. Verified shadava ragas — the app's raga-mode dataset

### True shadava-shadava (6 notes both directions)

| raga | tradition | arohana | avarohana | omitted | on C |
|---|---|---|---|---|---|
| **Pushpalathika** | Carnatic | `S R2 G2 M1 P N2 S` | `S N2 P M1 G2 R2 S` | **D** | C D Eb F G Bb |
| **Sriranjani** | Carnatic | `S R2 G2 M1 D2 N2 S` | `S N2 D2 M1 G2 R2 S` | **P** | C D Eb F A Bb |
| **Malayamarutham** | Carnatic | `S R1 G3 P D2 N2 S` | `S N2 D2 P G3 R1 S` | **M1** | C Db E G A Bb |
| **Nalinakanthi** | Carnatic | `S G3 R2 M1 P N3 S` | `S N3 P M1 G3 R2 S` | **D** | vakra aroha |
| **Devamanohari** | Carnatic | `S R2 M1 P D2 N2 S` | `S N2 D2 N2 P M1 R2 S` | **G** | C D F G A Bb, vakra ava |
| **Marwa** | Hindustani | `S r G M D N S'` | `S' N D M G r S` | **P** | C Db E F# A B |
| **Puriya** | Hindustani | `'N r G M D N S'` | vakra | **P** | C Db E F# A B |
| **Gaudgiri Malhar** | Hindustani | `S R g m P n S'` | `S' n P m g R S` | **D** | C D Eb F G Bb |
| **Ānandharoopa** | Carnatic | `S R2 G3 P D2 N3 S` | `S N3 D2 P G3 R2 S` | **M1** | C D E G A B ⚠️rare |

### Shadava in one direction only
**Kambhoji** (shadava-sampurna, N omitted in aroha, †bhashanga) ·
**Bahudari** (shadava-audava) · **Manirangu** (audava-shadava) ·
**Vasanta**, **Kedaram**, **Jayanthashri** (audava-shadava, vakra) ·
**Jaunpuri** (shadav-sampurna, komal g in aroha only) ·
**Rageshri**, **Sohini** (audav-shadav).

### Confirmed 5-note — do NOT file these as shadava
Hindolam · Abhogi · Shivaranjani · Malkauns · Deshkar · Bhupali · Durga · Tilang ·
Vrindavani Sarang · Megh · **Hamsadhwani** · Mohanam · Shuddha Saveri ·
Nagaswaravali · Madhyamavati · Udayaravichandrika.
**Audav-sampurna (5 up, 7 down):** Bhimpalasi, Multani, Desh, Abheri, Bilahari.

### Known source discrepancies to handle in the data
1. **Wikipedia's Jaunpuri jati is flatly wrong** — labels it audava-shadava while
   printing a 6-note aroha and 7-note avaroha. Correct: **shadav-sampurna**.
2. **Bageshri aroha is genuinely school-dependent** and the disagreement changes
   the jati: ITC-SRA/Wikipedia `S g m D n S'` = audav-sampurna; Tanarang
   `S R g m D n S'` = shadav-sampurna. **Present both.** Universal agreement: P
   omitted in aroha, avaroha sampurna.
3. **Tilak Kamod jati contested** (straight ascent 5 notes, characteristic vakra
   ascent re-introduces G).
4. **Wikipedia's Udayaravichandrika infobox is wrong** (prints G1/N1; prose says
   Kharaharapriya + minor pentatonic, requiring G2/N2).
5. **Wikipedia's Rageshree text claims Pa appears in descent** — contradicts its
   own printed avaroha and contradicts Tanarang. **Pa is absent both ways.**
6. **Marwa's Sa is not varjit but deliberately withheld** — used "at the end of a
   phrase and even then infrequently." Say this or someone will "correct" the
   6-note count by pointing at Sa.
7. **Marwa / Puriya / Sohini share one identical note set.** Discriminators
   (Parrikar): Marwa vadi–samvadi **r–D**; Puriya **G–N**; Sohini **D–G**. The
   cleanest test: Puriya approaches D–G from tivra Ma, Sohini from Ni, Marwa
   doesn't lean on D–G at all. **A scale-only app cannot tell these apart — say so
   rather than pretending otherwise.**

---

## 4. Rhythm — corrections to what I first wrote

### 4.1 The five gati — confirmed, with the etymologies that make them teachable

| count | name | Devanagari | why it's called that |
|---|---|---|---|
| 3 | **tisra** | तिश्र | ← *tri* (three) |
| 4 | **chatusra** | चतुरश्र | contraction of *caturaśra*, **"four-sided / square"** |
| 5 | **khanda** | खण्ड | **"piece, section"** |
| 7 | **misra** | मिश्र | **"mixed"** — because 7 = 3 + 4 |
| 9 | **sankeerna** | सङ्कीर्ण | **"jumbled, complex"** — because 9 = 4 + 5 |

The *misra* = "mixed" and *sankeerna* = "complex" etymologies are the
pedagogically valuable part: they explain *why* the odd numbers are named that
way, and musicians will recognise the point immediately.

### 4.2 🔴 gati vs nadai — my first framing was WRONG. Do not ship it.

I initially proposed "gati = in the composition, nadai = in percussion." **That is
not the standard distinction and could not be verified. Discard it.**

What sources actually say: **गति** *gati* (Sanskrit, "gait/movement") and **நடை**
*naṭai* (Tamil, "gait, walk") are **literal translations of each other** and *"for
all practical purposes they are used interchangeably."*

**The distinction that actually matters is jati vs nadai:** *jati* = the number of
aksharas in the **laghu**; *nadai/gati* = the number of **pulses per beat**.
The clean worked contrast: *"Khanda **jati**: five counts in the laghu. Khanda
**nadai**: five pulses per beat throughout."*

**Approved app copy:**
> *"gati (Sanskrit) / nadai (Tamil) — the number of pulses subdividing each beat.
> The two words are used interchangeably in practice. Not to be confused with
> jati, which is the number of aksharas in the laghu."*

### 4.3 🔴 Yati is SIX, not five. I said five.

| yati | Devanagari | image | shape | example |
|---|---|---|---|---|
| **Sama** | सम | "even" | constant | 5-5-5-5-5 |
| **Srotovaha** (Srotogata) | स्रोतोवह | **a river widening from its source** | **INCREASING** | **3-4-5-6-7** ✅ |
| **Gopuccha** | गोपुच्छ | **a cow's tail, tapering** | **DECREASING** | 7-6-5-4-3 |
| **Mridanga** | मृदङ्ग | the drum — narrow ends, fat middle | grow then shrink | 3-4-5-4-3 |
| **Damaru** | डमरु | hourglass drum — pinched waist | shrink then grow | 5-4-3-4-5 |
| **Vishama** | विषम | "uneven" | free-form | 4-7-3-9-5 |

**Jason's 3→4→5→6→7 ladder is SROTOVAHA YATI** — confirmed twice independently.

⚠️ **Srotovaha and gopuccha get swapped in some writing.** The etymology settles
it decisively and should be taught alongside the word: **a cow's tail tapers**
(decreasing); **a river widens from its source** (increasing). Teach the image and
you cannot be contradicted.

### 4.4 🔴 Konnakol — three of my syllable sets were wrong

**First, the relationship, which is commonly conflated:** *solkattu* is the larger
practice (syllables **+ hand-counting the tala**); **konnakol is the vocalisation**.

| units | canonical syllables | structure | my earlier version |
|---|---|---|---|
| 2 | Ta Ka | — | — |
| 3 | **Ta Ki Ta** | — | ✅ correct |
| 4 | **Ta Ka Di Mi** | — | ✅ correct |
| 5 | **Ta Din Gi Na Tom** | — | ❌ I had a variant, not the classic |
| 6 | **Ta Ka Di Mi Ta Ka** | 4+2 | ❌ missing |
| 7 | **Ta Ka Di Mi Ta Ki Ta** | **4+3** | ❌ I had 3+4 |
| 8 | Ta Ka Di Mi Ta Ka Jha Nu | — | — |
| 9 | **Ta Ka Di Mi Ta Din Gi Na Tom** | **4+5** | ❌ wrong |
| 10 | Ta Ka Ta Ki Ta Ta Din Gi Na Tom | 2+3+5 | — |

**Notes that matter:**
- **7 is canonically 4+3**, not 3+4. Both are used in practice; show 4+3 and
  mention 3+4 as a variant.
- **5 has three standard forms:** the classic **Ta Din Gi Na Tom**, plus
  **Ta Ka Ta Ki Ta** (2+3) and **Ta Ki Ta Ta Ka** (3+2). The 2+3 / 3+2 forms are
  what players actually use *inside* korvais.
- **Aspiration is genuinely inconsistent** across sources — Tha/Ta, Dhi/Di,
  Thom/Tom, Din/Dhin, Gi/Ki. There is no single correct romanisation. **Pick one
  convention and hold it.** Mixing "Tha" and "Ta" on one screen reads as sloppy.
- **Cite print, not web:** David P. Nelson, *Solkattu Manual* and *Konnakkol
  Manual* (Wesleyan University Press) are the standard English references.

### 4.5 Samam and eduppu — and a reversed-source trap

**Samam** सम / समम् (Tamil சமம்) — landing exactly on beat 1 of the avartanam;
*"a point of balance and resolution."*

**Eduppu** is **Tamil எடுப்பு**, from எடு "to take/lift" — **not Sanskrit.** The
Sanskrit equivalent is **ग्रह** *graha*, one of the *dasa tala prana*.

| type | Devanagari | meaning | where the phrase starts |
|---|---|---|---|
| **sama** | सम | "level" | **exactly on beat 1** |
| **atita** | अतीत | "past, elapsed" | **BEFORE** beat 1 (pickup) |
| **anagata** | अनागत | "not yet arrived" | **AFTER** beat 1 (delayed) |

🔴 **One cited source has atita and anagata reversed.** The assignment above is
correct, confirmed by a second source *and* by etymology: *atīta* = "already gone
past" (the start is past when the tala begins); *anāgata* = "not yet come."
It is further confirmed by repertoire — atita examples are *Sivakama Sundari* and
the Ata tala varnam; sama examples are *Sarali varisai*, *Janta varisai*,
*Vatapi Ganapatim*. **This corner is genuinely contested, so if the app teaches
it, teach the etymology alongside — that settles it.**

⚠️ The fractional-idam vocabulary ("1/2 eduppu", "3/4 eduppu") is standard usage
but **UNVERIFIED** from these sources.

---

## 5. Korvai arithmetic — the model for the resolution solver

This is the tradition's own version of what `solve_resolution()` does, and it is
worth implementing as an advanced mode.

**Korvai** (Tamil, "a stringing-together") — a rhythmic composition that resolves
exactly on samam. Structure: **purvangam** → (optional **madhyangam**) →
**uttarangam**, with phrases *"usually repeated 3 times."*
**Mora / mohra** (= **teermanam** "resolution" = **muktayi** "concluded") — **3
identical phrases** creating tension against the meter, resolving to samam.

**The method, verbatim from the sources: count backwards from the end.**

> **Adi tala, 1 kalai, chatusra nadai, 2 cycles = 64 subunits:**
> - Purvangam = **33** = `8+(3) + 8+(3) + 8+(3)` — an 8-unit phrase with a 3-unit *karvai* (gap), thrice
> - Uttarangam = 64 − 33 = **31** = `12 + 12 + 7`
>
> **Alternative split of the same 64:**
> - Purvangam = **36** = `9+(3) × 3`
> - Uttarangam = **28** = `6+(5) + 6+(5) + 6`

The mridangam-teacher version: *"we can split poorvaanga and utharaanga which are
in themselves divisible by three… **The elegance of the arithmetic is creating the
repetitive pattern using one of the pancha nadais (3,4,5,7 or 9) or their
multiples.**"*

**Algorithm for the app:**
1. fix total subunits from eduppu to the target samam;
2. find a split where each half decomposes into 3 × (phrase + karvai);
3. when a remainder isn't divisible by 3, **absorb the difference into the karvai
   (rest) lengths, not the phrase**;
4. build phrases from 3/4/5/7/9 or their multiples.

---

## 6. The varisai ladder — the app's exercise progression

**Confirmed order and content:**

| # | exercise | what it drills |
|---|---|---|
| 1 | **Sarali Varisai** | simple ascent/descent, variations by **re-sequencing notes**. 14 exercises, raga Mayamalavagaula, Adi tala, **3 speeds** |
| 2 | **Melsthayi / Ecchusthayi** | extends into the **upper** octave |
| 3 | **Mandrasthayi / Thaggusthayi** | the mirror — **lower** octave |
| 4 | **Janta Varisai** | **paired/twinned notes** — each note of sarali sung twice; later sets use triples. Builds attack and gamaka control |
| 5 | **Dhatu Varisai** | **zigzag sequences / permutations** — ***this is the direct analogue of Western "in 3rds / in 4ths"*** |
| 6 | **Alankaram** | the same patterns transplanted **across talas** |

*(Melsthayi/Ecchusthayi and Mandrasthayi/Thaggusthayi are the same exercises under
Sanskrit vs Tamil names — *mel/ecchu* = upper, *mandra/thaggu* = lower.)*

**Alankaras:** the full traditional corpus is **35** (7 talas × 5 jatis), of which
**7 in the sapta talas** are standard for beginners — the **Suladi Sapta Tala
Alankaras**. Jason's statement was correct, but **be precise that the corpus is 35
and the teaching set is 7** — exactly the kind of thing a trained musician will
test.

### 🎯 The two structural facts worth copying into the app's design

1. **Every level is practised in 3–4 speeds** — this is the **kala pramanam**
   ladder (1st speed, 2nd = double, 3rd = quadruple). **Tempo-doubling should be a
   first-class axis in the app, not a slider afterthought.** That is how the
   tradition actually gears up.
2. **Levels 1–5 stay in ONE raga (Mayamalavagaula) and vary only the pattern.**
   Then Alankaram holds the pattern constant and varies the **tala**.
   **That two-phase design — permute, then re-tala — is the real varisai system,
   and it maps perfectly onto this app:** fix the six-note set, run the
   permutation ladder, then run the same material through gati/tala changes.

**Use this as the app's curriculum spine instead of inventing a Western one.**

---

## 7. Do NOT state as fact (⚠️ UNVERIFIED)

- Ānandharoopa / Suranandini scales — web databases only, no print authority
- The fractional-idam eduppu vocabulary ("1/2 eduppu")
- Tamil scripts for korvai / teermanam / konnakol
- **Sapta tala akshara totals** — computed, not sourced; the one available source's
  own numbers are self-inconsistent. **Verify against Bhagyalekshmy or the Music
  Academy syllabus before shipping any akshara count.**
- All Devanagari orthography in this document (standard, but unaudited)
