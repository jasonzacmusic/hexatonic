# Scale coverage: every page, every scale, every mode

Checked 29 Sep 2026 on branch `p2-every`. Locked by `tests/scale-coverage.test.ts`
(every family × every mode against every page's menu) and `tests/mode-coach.test.ts`
(the "How to practise" card for every scale, mode and key).

## The library (`src/lib/theory/scales.ts`)

| Group (menu heading) | Families | Modes |
|---|---|---|
| Six notes · Remove one note | Diatonic hexachord; Dominant (no 4) | Diatonic: 6 (Sunday, Minor no 6, Phrygian no 5th, Major no 4, Suspended no 3rd, Dark minor no 2); Dominant: 1 |
| Six notes · Pentatonic plus one | Blues; Major blues | 1 each |
| Six notes · Symmetrical | Whole tone; Augmented; Petrushka; Messiaen mode 5; No common name | 1 each |
| Six notes · Colour scales | Prometheus | 1 |
| Not six notes · Seven notes and their modes | Major scale; Harmonic minor; Melodic minor | **7 each (new)** |
| Not six notes · Pentatonic and its modes (5 notes) | Major pentatonic | **5 (new)** |
| Not six notes · Octatonic (8 notes) | Whole–half; Half–whole | 1 each |
| Not six notes · World scales (5 and 7) | Hirajoshi, In sen, Iwato, Kumoi, Yo, Hijaz | 1 each |
| Your own · Custom | Custom | — |

50 scale-and-mode choices in all (was 26). Before this change the seven-note
modes, harmonic and melodic minor modes and the pentatonic modes existed only as
Harmony's "7-note parent" list, and could not be drilled, heard or improvised over.

Two duplicates are deliberate and named as such in the app: Phrygian dominant is
the same notes as Hijaz, and Ritsusen the same notes as Yo.

## Before: what each page offered

| Page / tab | Picker | Offered | Missing |
|---|---|---|---|
| Home — eight sounds | none (a sampler) | 8 fixed sounds | everything else, by design |
| Practice | family menu + mode menu (diatonic only) | 6 six-note groups, world, custom | penta, major scale, octatonics; no modes outside diatonic; modes in a dropdown |
| Sounds | card gallery | all six-note families and modes, world, custom link | penta, major scale, octatonics; no picker, no practise guidance |
| Improvise | one flat menu | six-note families and modes, world | penta, major scale, octatonics, custom |
| Ear | game levels only | 6 diatonic modes (mode game); diatonic, blues, whole tone, augmented, major blues, Prometheus, hirajoshi, in sen (family game) | no way to hear any other scale |
| Harmony · Chords | menu, modes listed as options | six-note groups, world, "Minor, no 7th" | penta, major scale, octatonics |
| Harmony · Pairs | chips (6-note) / parent chips (7-note) | every six-note scale; 9 parents | the rest were simply absent |
| Harmony · Sixth–diminished | Harmony menu (shared file) | as Chords | — (sibling branch's area; not changed here) |
| Learn | none | a fixed lesson in G, in Jason's order | by design |
| Bar-count calculator (/resolution), Tihai | none | note count only / fixed G Major (no 4) | by design: rhythm pages, not scale pages |

## After: one shared menu everywhere

Every scale page now draws `ScaleModePicker` (`src/components/ScaleModePicker.tsx`)
from one list (`src/lib/scaleMenu.ts`): the same headings in the same order, six-note
scales first, then a **mode strip** — numbered chips with the mode names, one tap each.
The Sunday-Scale shape reads 1 Sunday (no 7), 2 Minor (no 6), 3 Phrygian (no 5th),
4 Major (no 4), 5 Suspended (no 3rd), 6 Dark minor (no 2). ← and → step through the
modes on Practice, Sounds, Improvise, Ear, Chords and Pairs ([ ] still step the key
on Practice; the arrows are ignored while a menu, a text field or a chip row has focus).

| Page / tab | Offers | Greyed out, with the reason shown |
|---|---|---|
| Practice | all 50 | none |
| Sounds (new "Every scale, every mode" section) | all but Custom | Custom — "Build your own on Practice: this page needs a named scale." |
| Improvise | all but Custom | Custom — same reason |
| Ear (new "Hear any scale first" panel) | all but Custom | Custom — same reason |
| Harmony · Chords | all but Custom, plus "Minor, no 7th" | Custom — same reason |
| Harmony · Pairs (6-note scale) | the 15 six-note choices | Custom; five-note scales ("two triads always make six"); seven-note scales ("choose 7-note parent above"); octatonics ("see the Sixth–diminished tab") |
| Harmony · Sixth–diminished | unchanged | sibling branch's area |
| Home, Learn, /resolution, Tihai | unchanged | not scale pickers (sampler, fixed lesson, rhythm pages) |

## "How to practise this mode"

A short card on Practice, Sounds, Improvise, Ear and Harmony · Chords, computed by
`src/lib/modeCoach.ts` for any scale, mode and key:

- **Colour** — the note(s) that make the mood, with their degrees (G Major (no 4): B (3) and F♯ (7)).
- **Pair** — the two triads that play it, blue then violet, with a link to that pair's ladder
  (G Major (no 4): Em + D; D Dorian: Dm + Em, no C; G Mixolydian: G + F, no E). Five- and
  eight-note scales, and six-note scales no two triads make, say why instead.
- **Drone** — hold the tonic and its 5th, or the tonic alone when there is no perfect 5th.
- **Leave out** — the removed note(s), in red.
- **Links** — Practice in broken thirds; the Ear level that asks about it (`/ear?game=mode&level=N`, new), or "Not in the ear games yet".

Ear labels now match the library: "Unstable (no 5th)" is "Phrygian (no 5th)", and
"Mixolydian (no 4)" is "Dominant (no 4)".
