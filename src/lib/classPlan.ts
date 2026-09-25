/**
 * The 90-minute public class, as data. The /class run-sheet renders it and
 * tests/classPlan.test.ts checks the arithmetic (it must sum to exactly 90) and
 * that every link points at a real route.
 *
 * Three strands run through every segment: THEORY (why), EAR (hear it before
 * you name it) and PIANO (hands on keys). A segment is never only one of them
 * for long — that is the design.
 *
 * Every factual line here is one the engine computes or the test suite locks:
 * the tritone-free removals, the relative-scale identity, the all-perfect
 * fourths, blues = major blues a minor third away, and the Barry Harris lens.
 */

export type Strand = "theory" | "ear" | "piano";

export interface Segment {
  min: number;
  title: string;
  strands: Strand[];
  goal: string;
  say: string[];
  do: string[];
  twist: string;
  href: string;
  cta: string;
}

export const CLASS_PLAN: Segment[] = [
  {
    min: 5, title: "The hook: remove one note", strands: ["ear", "theory"],
    goal: "Everyone hears the difference before anyone names it.",
    say: [
      "Play C major up and down. Then play it again without F.",
      "Ask: what changed? Which one feels calmer — less like it wants to go somewhere?",
      "Reveal: the major scale has exactly one tritone, F–B. Remove F and it is gone.",
    ],
    do: ["Room votes with hands: first version or second version is calmer?"],
    twist: "Don't say 'hexatonic' yet. Let the ear discover it; give the name at minute 5.",
    href: "/learn", cta: "Theorem 1, with the audio proof",
  },
  {
    min: 10, title: "Knock one out", strands: ["theory"],
    goal: "Students predict, then see: only two removals kill the tritone.",
    say: [
      "Remove each degree of C major in turn. Only the 4 and the 7 give zero tritones.",
      "Natural minor: only the 2 and the ♭6. It is the same rule — minor is major's rotation.",
      "C major without 4 and A minor without ♭6 are the same six notes: C D E G A B.",
      "Harmonic and melodic minor: impossible. Each has two tritones that share no note.",
    ],
    do: [
      "Before each row: students guess 'tritone or not?' on fingers (thumb up/down).",
      "Show the Knock-one-out table with Major, then Natural minor, then Harmonic minor.",
    ],
    twist: "The harmonic-minor reveal: 'there is NO clean six-note scale in harmonic minor' surprises everyone.",
    href: "/workout", cta: "Knock one out table",
  },
  {
    min: 10, title: "Ear game: which note is missing?", strands: ["ear"],
    goal: "Hear an absence. The hardest and most useful listening skill.",
    say: [
      "The app plays a major scale with one degree removed. Which one?",
      "Show the answer on your fingers: 2 to 7.",
    ],
    do: [
      "Six rounds as a room, fingers up on the count of three.",
      "Silent-singing drill: everyone sings the full scale while you play the hexatonic — the room sings the missing note loud into the gap.",
    ],
    twist: "Silent singing turns the gap into a note they produce themselves. That is audiation, not guessing.",
    href: "/ear", cta: "Which note is missing?",
  },
  {
    min: 15, title: "At the piano: the minor hexatonic", strands: ["piano", "theory"],
    goal: "Hands learn one scale properly: up, down, in thirds, in fourths.",
    say: [
      "C D E♭ F G B♭ — the minor scale without its ♭6. This is raga Pushpalathika.",
      "Play it in fourths: every single interval comes out perfect. Six for six.",
      "Play it in thirds: two major, two minor — and two perfect fourths where the gap is.",
    ],
    do: [
      "Aroha–avaroha, right hand, then left, then both — 84 bpm.",
      "Ring the fourths: left hand holds C, right hand walks the fourths cycle.",
      "Presenter mode: 'Minor', then 'In fourths', then 'In thirds' presets.",
    ],
    twist: "Ask them to find the one scale in the room where fourths are ALL perfect. The major scale fails: F–B.",
    href: "/live", cta: "Presenter mode",
  },
  {
    min: 10, title: "The family: blues, gospel, whole tone, augmented", strands: ["ear", "theory"],
    goal: "Four more hexatonics, each with a character the ear can grab.",
    say: [
      "Blues: minor pentatonic plus ♭5. Gospel (major blues): major pentatonic plus ♭3.",
      "C blues and E♭ major blues are the SAME six notes — one is the other a minor third away.",
      "Whole tone: no perfect fifth anywhere, only two exist. Augmented: two augmented triads, four exist.",
    ],
    do: [
      "Character game: you play one of the four; students call its name — bite, church, dream, shimmer.",
    ],
    twist: "Give each scale a one-word character before its theory. The ear remembers words it attached to sounds.",
    href: "/workout", cta: "The named hexatonics",
  },
  {
    min: 10, title: "Rhythm: groupings that land", strands: ["piano", "theory"],
    goal: "Feel why six notes are the right size for rhythm practice.",
    say: [
      "In groups of 3, 4 or 6 in sixteenths the hexatonic comes back to beat 1 in 3 bars. The major scale takes 7 to 21.",
      "Groups of 5 in eighth-note triplets land in 5 bars — the app shows the bar count before you press play.",
      "Say it in konnakol: ta-ki-ta, ta-ka-di-mi, ta-di-gi-na-thom.",
    ],
    do: [
      "Whole room: tisra (3s), then chatusra (4s), then khanda (5s), clapping the accent.",
      "Volunteers at the piano play the scale while the room claps the grouping.",
    ],
    twist: "6 shares factors with almost everything and 7 shares with nothing. The six-note scale is the one to learn grouping on.",
    href: "/live", cta: "Presenter mode — the yati presets",
  },
  {
    min: 12, title: "Harmonise it — and the Barry Harris lens", strands: ["theory", "piano", "ear"],
    goal: "Chords live inside the scale; two notes have none of their own.",
    say: [
      "C D E G A B holds four triads: C, Am, Em, G. And C6 = Am7 — one chord, two names.",
      "D and B are the only notes with no triad of their own.",
      "Barry Harris: C6 alternates with B°7. D and B are exactly the diminished notes. That's why they sound like passing notes — they are.",
    ],
    do: [
      "Play 'Harmonise the scale' in the Barry lens: C6 under chord tones, B°7 under D and B.",
      "Students play melody C-D-E with right hand while left hand alternates C6 / B°7.",
    ],
    twist: "This is the first step of the Barry Harris thread we'll build week by week: every six-note scale here sits inside his sixth-diminished world.",
    href: "/workout", cta: "Harmonisation + Barry lens",
  },
  {
    min: 10, title: "Create: roll the dice", strands: ["piano", "ear"],
    goal: "Everyone makes something of their own before they leave.",
    say: ["Roll a random key, scale, drill and creative constraint on the Workout page."],
    do: [
      "Pairs: one plays a drone or I–vi vamp, one improvises for a minute, then swap.",
      "Roll again for the second pair. Two volunteers perform for the room.",
    ],
    twist: "The constraint is the gift: 'land on a chord tone on every beat 1' makes beginners sound deliberate.",
    href: "/workout", cta: "Roll a challenge",
  },
  {
    min: 8, title: "Recap, homework, questions", strands: ["theory"],
    goal: "Five sentences to remember and a week of 20-minute practice.",
    say: [
      "Recap the five takeaways (below). Share the app link.",
      "Homework: one station a day for seven days — the list below.",
    ],
    do: ["Q&A. Point people to /workout for the 4½-hour plan and the dice."],
    twist: "End on sound, not talk: play the minor hexatonic in fourths one last time.",
    href: "/workout", cta: "The Workout",
  },
];

export const TAKEAWAYS = [
  "Remove the 4 or the 7 from major (the 2 or the ♭6 from minor) and the tritone is gone. No other single note does it.",
  "Major without 4 and its relative minor without ♭6 are the same six notes.",
  "Play the diatonic hexatonic in fourths and every interval is perfect.",
  "Blues and gospel (major blues) are one set of notes, a minor third apart.",
  "Harmonise with Barry Harris's eyes: chord tones get the 6th chord, the rest get the diminished.",
];

export const HOMEWORK: { day: string; task: string; href: string }[] = [
  { day: "Day 1", task: "Minor hexatonic, aroha–avaroha, in C, G and D. Hands separately, then together.", href: "/practice" },
  { day: "Day 2", task: "Knock one out in G major: sing the missing note before you play each row.", href: "/workout" },
  { day: "Day 3", task: "In fourths, all twelve keys, round the circle.", href: "/practice?p=fourths" },
  { day: "Day 4", task: "Blues, then gospel, over the twelve-bar lane.", href: "/improvise?lane=blues" },
  { day: "Day 5", task: "Groups of 5 in triplets — count ta-di-gi-na-thom out loud.", href: "/practice?s=3&g=5&p=aroha" },
  { day: "Day 6", task: "Harmonise C D E G A B with the Barry lens: C6 and B°7.", href: "/harmony?tab=barry" },
  { day: "Day 7", task: "Roll the dice three times. Record the last one.", href: "/workout" },
];

export const TOTAL_MIN = CLASS_PLAN.reduce((a, s) => a + s.min, 0);
