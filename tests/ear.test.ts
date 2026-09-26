/**
 * The ear games must be musically sound: what is asked is what is heard.
 *
 * Every question is generated hundreds of times with a seeded random source,
 * across every option, and checked for the things that make an ear game
 * unfair: the answer missing from the choices, two choices that would sound
 * the same, a "missing" note that actually sounds, an accent pattern that is
 * not the one asked about, or a key that is never set.
 */
import { describe, it, expect } from "vitest";
import {
  ACCENT_LEVELS, ACCENT_STEPS, DEFAULT_OPTIONS, FAMILY_DIATONIC, FAMILY_LEVELS, GAMES, GameId, LEVELS,
  MISSING_LEVELS, MODE_LEVELS, Options, Question, QUALITY_POOL, barsToLand, choiceLabel, clampLevel,
  levelCount, makeQuestion, accentSteps,
} from "../src/lib/ear/games";
import { EAR_KEYS, PARENTS, SOUNDS, soundById, spellParent, spellSound } from "../src/lib/ear/sounds";
import { cadenceChords, relPcs } from "../src/lib/ear/program";
import { PHRASES, SWUNG, stepTime } from "../src/lib/ear/phrases";
import {
  SESSION_LENGTH, UNLOCK_STREAK, confusionTip, freshProgress, loadProgress, recordAnswer, summarise,
} from "../src/lib/ear/progress";
import { buildScale } from "../src/lib/theory/scales";
import { gatiFor } from "../src/lib/theory/resolution";

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPTION_SETS: Options[] = [];
for (const level of [1, 2, 3, 4])
  for (const tempo of [84, 132])
    OPTION_SETS.push({ ...DEFAULT_OPTIONS, level, tempo });

/** Questions across every level of the game (levels past the last clamp). */
function* questions(game: GameId, n = 400, onlyLevel?: number): Generator<{ q: Question; opts: Options }> {
  const rng = seeded(game.length * 7919 + 17 + (onlyLevel ?? 0));
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    const base = OPTION_SETS[i % OPTION_SETS.length];
    const opts = { ...base, level: onlyLevel ?? clampLevel(game, base.level) };
    const q = makeQuestion(game, opts, prev, rng);
    prev = q.key;
    yield { q, opts };
  }
}

const melody = (q: Question) => q.prompt.events.filter((e) => e.melody);
const tonicMidi = (q: Question) => (q.facts.midis as number[] | undefined)?.[0]
  ?? (q.facts.steps as { midi: number }[])[0].midi;

describe("every sound spells correctly in every key", () => {
  it("matches its semitones, with no double sharps or flats", () => {
    const bad: string[] = [];
    for (const def of SOUNDS)
      for (const key of EAR_KEYS) {
        const sp = spellSound(key, def);
        const rel = sp.midis.map((m) => m - sp.midis[0]);
        if (rel.join() !== def.semis.join()) bad.push(`${def.id}/${key}: ${rel}`);
        if (sp.notes.some((n) => Math.abs(n.alt) > 1)) bad.push(`${def.id}/${key} double accidental`);
        // same pitch as the key asked for, even when spelled enharmonically
        const want = spellParent(key, "major").midis[0] % 12;
        if (sp.midis[0] % 12 !== want) bad.push(`${def.id}/${key} moved the tonic`);
        // the key's name is the spelled tonic's name (never "Db" over C# E F#)
        const t = sp.notes[0];
        const name = t.letter + (t.alt > 0 ? "#" : t.alt < 0 ? "b" : "");
        if (sp.key !== name) bad.push(`${def.id}/${key} named ${sp.key} but spelled from ${name}`);
      }
    expect(bad).toEqual([]);
  });

  it("major and natural-minor parents spell cleanly in every key", () => {
    for (const key of EAR_KEYS)
      for (const parent of ["major", "minor"] as const) {
        const sp = spellParent(key, parent);
        expect(sp.midis.map((m) => m - sp.midis[0])).toEqual([...PARENTS[parent]]);
        expect(sp.notes.every((n) => Math.abs(n.alt) < 2)).toBe(true);
        expect(new Set(sp.notes.map((n) => n.letter)).size).toBe(7);
      }
  });
});

describe("every game", () => {
  for (const g of GAMES) {
    it(`${g.id}: the answer is a choice and no two choices sound alike`, () => {
      for (const { q } of questions(g.id)) {
        const ids = q.choices.map((c) => c.id);
        expect(ids).toContain(q.answer);
        expect(new Set(ids).size).toBe(ids.length);
        const sigs = ids.map((id) => q.signatures[id]);
        expect(sigs.every(Boolean)).toBe(true);
        expect(new Set(sigs).size, `${g.id} duplicate-sounding choices: ${sigs}`).toBe(sigs.length);
        expect(q.choices.length).toBeLessThanOrEqual(6);
      }
    });

    it(`${g.id}: the key is set before the question`, () => {
      for (const { q } of questions(g.id, 60)) {
        expect(q.prompt.phases[0]).toEqual({ at: 0, label: "Setting the key" });
        const first = melody(q)[0];
        const keySetting = q.prompt.events.filter((e) => !e.melody && e.at < first.at);
        expect(first.at).toBeGreaterThanOrEqual(1.5);
        expect(keySetting.length).toBeGreaterThan(0);
        // the key-setter always sounds the tonic
        const t = tonicMidi(q) % 12;
        expect(keySetting.some((e) => e.midis.some((m) => m % 12 === t))).toBe(true);
      }
    });

    it(`${g.id}: the reveal plays your pick, then the answer`, () => {
      for (const { q } of questions(g.id, 60)) {
        for (const c of q.choices) {
          const r = q.reveal(c.id);
          expect(r.right).toBe(c.id === q.answer);
          expect(r.rows.map((x) => x.id)).toEqual(r.right ? ["answer"] : ["pick", "answer"]);
          const marks = r.program.events.filter((e) => e.mark);
          expect(marks.length).toBeGreaterThan(0);
          // pick sounds before the answer
          const firstAns = marks.find((e) => e.mark!.row === "answer")!;
          expect(marks.filter((e) => e.mark!.row === "pick").every((e) => e.at < firstAns.at)).toBe(true);
          // every lit chip exists
          for (const e of marks) {
            const row = r.rows.find((x) => x.id === e.mark!.row)!;
            expect(e.mark!.chips.every((i) => i >= 0 && i < row.chips.length)).toBe(true);
          }
          for (const text of [r.verdict, r.tell, r.detail ?? ""])
            expect(text).not.toMatch(/undefined|NaN|\{|\}|\(\)/);
        }
      }
    });
  }
});

describe("the pitch games play exactly the scale they ask about", () => {
  for (const game of ["quality", "mode", "family"] as GameId[])
    it(`${game}: the tune plays the sound's notes, all of them, nothing else`, () => {
      for (const { q } of questions(game)) {
        if (game === "quality" && q.level === 1) continue;           // the chord level
        const def = soundById(q.facts.sound as string);
        const t = tonicMidi(q);
        expect(relPcs(t, melody(q).flatMap((e) => e.midis))).toEqual(def.semis);
      }
    });

  it("quality: the answer's 3rd sounds, and the other kinds of 3rd do not", () => {
    const third = { major: 4, minor: 3, sus: 5 } as const;
    for (const { q } of questions("quality")) {
      const heard = relPcs(tonicMidi(q), melody(q).flatMap((e) => e.midis));
      const a = q.answer as keyof typeof third;
      expect(heard).toContain(third[a]);
      if (a === "major") expect(heard).not.toContain(3);
      if (a === "minor") expect(heard).not.toContain(4);
      if (a === "sus") { expect(heard).not.toContain(3); expect(heard).not.toContain(4); }
    }
  });

  it("quality: every pool sound has one kind of 3rd (or none) and a perfect 5th", () => {
    for (const s of QUALITY_POOL) {
      const has3 = s.semis.includes(3), has4 = s.semis.includes(4);
      expect(has3 && has4).toBe(false);
      expect(s.semis).toContain(7);
      expect(s.quality).toBe(has4 ? "major" : has3 ? "minor" : "sus");
    }
  });

  it("quality level 1 plays only the chord: 1, the deciding note, 5", () => {
    const third = { major: 4, minor: 3, sus: 5 } as const;
    for (const { q } of questions("quality", 60, 1)) {
      const heard = relPcs(tonicMidi(q), melody(q).flatMap((e) => e.midis));
      expect(heard).toEqual([0, third[q.answer as keyof typeof third], 7].sort((a, b) => a - b));
    }
  });

  it("mode: three, then five, then all six rotations; a chord only below the top level", () => {
    for (const level of [1, 2, 3]) {
      for (const { q } of questions("mode", 40, level)) {
        expect(q.choices.map((c) => c.id)).toEqual(MODE_LEVELS[level - 1]);
        const chord = melody(q).some((e) => e.midis.length >= 5);
        expect(chord).toBe(level < 3);
      }
    }
    expect(MODE_LEVELS.map((l) => l.length)).toEqual([3, 5, 6]);
  });

  it("family: the top level offers Sunday Scale, Prometheus, Hirajoshi and In sen, and no catch-all Diatonic", () => {
    const top = FAMILY_LEVELS[FAMILY_LEVELS.length - 1];
    for (const id of ["folk", "prometheus", "hirajoshi", "insen"]) expect(top).toContain(id);
    expect(top).not.toContain("diatonic");
    expect(choiceLabel("family", "folk")).toBe("Sunday Scale");
    expect(soundById("folk").label).toBe("Sunday Scale (no 7)");
    // the world scales are the app's own families, note for note
    for (const id of ["hirajoshi", "insen"]) {
      const s = buildScale("G", id);
      expect(s.family.id).toBe(id);
      expect(s.notes.length).toBe(soundById(id).semis.length);
      const sp = spellSound("G", soundById(id));            // throws if scales.ts disagrees
      expect(sp.midis.map((m) => m - sp.midis[0])).toEqual(soundById(id).semis);
    }
  });

  it("mode and family: in every level, no choice's notes all sit inside another's", () => {
    for (const game of ["mode", "family"] as const)
      for (let level = 1; level <= levelCount(game); level++)
        for (const { q } of questions(game, 30, level)) {
          const sets = q.choices.map((c) => q.signatures[c.id].split(",").map(Number));
          sets.forEach((a, i) => sets.forEach((b, j) => {
            if (i === j) return;
            const inside = a.every((x) => b.includes(x));
            expect(inside, `${game} L${level}: ${q.choices[i].id} inside ${q.choices[j].id}`).toBe(false);
          }));
        }
  });

  it("family: the diatonic answer is always a real diatonic rotation", () => {
    for (const id of FAMILY_DIATONIC) {
      const s = buildScale("G", "diatonic", 0);
      expect(s.error).toBeUndefined();
      expect(soundById(id).family).toBe("diatonic");
    }
  });
});

describe("which note is missing", () => {
  it("the missing note really is missing, and the other six all sound", () => {
    for (const { q } of questions("missing")) {
      const parent = q.facts.parent as "major" | "minor";
      const removed = q.facts.removed as number;
      const heard = relPcs(tonicMidi(q), melody(q).flatMap((e) => e.midis));
      const want = PARENTS[parent].filter((_, i) => i !== removed - 1);
      expect(heard).toEqual([...want]);
      expect(heard).not.toContain(PARENTS[parent][removed - 1]);
      expect(q.answer).toBe(String(removed));
    }
  });

  it("the cadence names the whole parent key and nothing outside it", () => {
    for (const minor of [false, true]) {
      const pcs = relPcs(60, cadenceChords(60, minor).flat());
      expect(pcs).toEqual([...(minor ? PARENTS.minor : PARENTS.major)]);
    }
  });

  it("the cadence sits in the same register as the scale that follows it", () => {
    for (const { q } of questions("missing", 60)) {
      const t = tonicMidi(q);
      const chords = q.prompt.events.filter((e) => !e.melody && e.midis.length === 4);
      expect(chords.length).toBe(4);
      for (const c of chords) {
        expect(Math.max(...c.midis)).toBeLessThanOrEqual(t + 12);
        expect(Math.min(...c.midis.slice(1))).toBeGreaterThanOrEqual(t - 2);
      }
    }
  });

  it("scrambled keeps a tonic drone under the notes", () => {
    for (const { q } of questions("missing", 100, 3)) {
      const m = melody(q);
      const t = tonicMidi(q) % 12;
      const drone = q.prompt.events.filter((e) => !e.melody && e.midis.every((x) => x % 12 === t));
      expect(drone.some((d) => d.at <= m[0].at + 0.01 && d.at + d.dur >= m[0].at)).toBe(true);
      expect(drone.some((d) => d.at + d.dur >= m[m.length - 1].at)).toBe(true);
    }
  });

  it("the reveal fills the gap with the missing note", () => {
    for (const { q } of questions("missing", 100)) {
      const r = q.reveal(q.answer);
      const played = r.program.events.flatMap((e) => (e.melody ? e.midis : []));
      expect(played).toContain(q.facts.removedMidi as number);
      const row = r.rows.find((x) => x.id === "answer")!;
      expect(row.chips.filter((c) => c.state === "removed").length).toBe(1);
    }
  });
});

describe("accents in groups", () => {
  it("the accent falls every N notes, exactly, and the prompt length never gives it away", () => {
    const lengths = new Set<number>();
    for (const { q } of questions("accents")) {
      const g = q.facts.grouping as number;
      const m = melody(q);
      expect(m.length).toBe(ACCENT_STEPS);
      m.forEach((e, i) => expect(!!e.accent).toBe(i % g === 0));
      // at least three full groups, and accents are louder and carry a low tonic
      expect(m.filter((e) => e.accent).length).toBeGreaterThanOrEqual(3);
      for (const e of m) {
        if (e.accent) { expect(e.vel).toBeGreaterThan(0.8); expect(e.midis.length).toBe(2); }
        else { expect(e.vel).toBeLessThan(0.5); expect(e.midis.length).toBe(1); }
      }
      lengths.add(m.length);
    }
    expect(lengths.size).toBe(1);
  });

  it("with the melody, every leap down lands on an accent, so the tune agrees with the count", () => {
    const scale = [55, 57, 59, 60, 62, 64];
    for (const g of [3, 4, 5, 7]) {
      const s = accentSteps(g, ACCENT_STEPS, scale, true);
      s.forEach((x, i) => {
        if (i > 0 && x.midi < s[i - 1].midi) expect(x.accent).toBe(true);
        if (i > 0 && !x.accent) expect(x.midi).toBeGreaterThan(s[i - 1].midi);
      });
    }
  });

  it("accents only: one repeated pitch, so the accent is the only cue", () => {
    for (const g of [3, 4, 5, 7])
      expect(new Set(accentSteps(g, ACCENT_STEPS, [60, 62, 64, 65, 67, 69], false).map((s) => s.midi)).size).toBe(1);
  });

  it("the landing claim is the real least common multiple", () => {
    expect([3, 4, 5, 7].map(barsToLand)).toEqual([3, 1, 5, 7]);
    expect([3, 4, 5, 7].map((g) => gatiFor(g)?.name)).toEqual(["Tisra", "Chatusra", "Khanda", "Misra"]);
  });
});

describe("the tells are true", () => {
  const has = (id: string, s: number) => soundById(id).semis.includes(s);
  it("whole tone has no perfect 5th anywhere", () => {
    const s = soundById("whole").semis;
    for (const a of s) for (const b of s) expect((b - a + 12) % 12).not.toBe(7);
  });
  it("the diatonic rotations have no tritone and a perfect 5th above the tonic", () => {
    for (const id of FAMILY_DIATONIC) {
      const def = soundById(id);
      const sp = spellSound("G", def);
      expect(buildScale(sp.key, "diatonic", 0).tritones).toBe(0);
      const s = def.semis;
      expect(s.some((a) => s.includes((a + 6) % 12))).toBe(false);
      expect(s).toContain(7);
    }
  });
  it("augmented alternates minor 3rd and half step", () => {
    const s = [...soundById("aug").semis, 12];
    expect(s.slice(1).map((x, i) => x - s[i])).toEqual([3, 1, 3, 1, 3, 1]);
  });
  it("the named notes are where the tells say", () => {
    expect(has("blues", 6) && has("blues", 7)).toBe(true);          // ♭5 next to the 5th
    expect(has("blues-major", 3) && has("blues-major", 4)).toBe(true);
    expect(has("prometheus", 7)).toBe(false);                        // no 5th above the tonic
    expect(has("unstable", 7)).toBe(false);
    expect(has("sus", 3) || has("sus", 4)).toBe(false);
    expect(has("folk", 10) || has("folk", 11)).toBe(false);           // no 7th
    expect(has("maj-no4", 5) || has("maj-no4", 6)).toBe(false);       // no 4th
    expect(has("min-no6", 8) || has("min-no6", 9)).toBe(false);       // no 6th
    expect(has("dark", 1) || has("dark", 2)).toBe(false);             // no 2nd
  });
});

describe("the tunes (phrases.ts)", () => {
  const used = new Set<string>();
  for (const g of ["quality", "mode", "family"] as GameId[])
    for (const { q } of questions(g, 200)) used.add(q.facts.sound as string);

  it("every sound a game can play has a tune", () => {
    for (const id of used) expect(PHRASES[id], id).toBeDefined();
  });

  it("each tune starts and ends on the tonic, uses every note of its sound and nothing else", () => {
    for (const [id, phrase] of Object.entries(PHRASES)) {
      const def = soundById(id);
      const pcs = [...new Set(phrase.map(([s]) => ((s % 12) + 12) % 12))].sort((a, b) => a - b);
      expect(pcs, id).toEqual(def.semis);
      expect(phrase[0][0], id).toBe(0);
      expect(phrase[phrase.length - 1][0], id).toBe(0);
    }
  });

  it("each tune moves smoothly in a comfortable range: no leap past a 5th, within an octave", () => {
    for (const [id, phrase] of Object.entries(PHRASES)) {
      const semis = phrase.map(([s]) => s);
      for (let i = 1; i < semis.length; i++)
        expect(Math.abs(semis[i] - semis[i - 1]), `${id} leap at ${i}`).toBeLessThanOrEqual(7);
      expect(Math.min(...semis)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...semis)).toBeLessThanOrEqual(12);
      // the last note is held: the tune lands
      expect(phrase[phrase.length - 1][1]).toBeGreaterThanOrEqual(2);
    }
  });

  it("the tell is leaned on: louder in the prompt than the other notes", () => {
    for (const { q } of questions("mode", 60, 3)) {
      const def = soundById(q.facts.sound as string);
      const t = tonicMidi(q);
      const notes = melody(q);
      const isTell = (m: number) => def.tellSemis.includes((((m - t) % 12) + 12) % 12);
      const tells = notes.filter((e) => isTell(e.midis[0]));
      const others = notes.filter((e) => !isTell(e.midis[0]));
      if (!tells.length) continue;
      const avg = (xs: typeof notes) => xs.reduce((a, e) => a + e.vel, 0) / xs.length;
      expect(avg(tells)).toBeGreaterThan(avg(others));
    }
  });

  it("the melody sits in a comfortable register: nothing above F5", () => {
    for (const g of GAMES)
      for (const { q } of questions(g.id, 100)) {
        const ms = melody(q).flatMap((e) => (e.midis.length === 1 ? e.midis : []));
        expect(Math.max(...ms)).toBeLessThanOrEqual(77);
        expect(Math.min(...ms)).toBeGreaterThanOrEqual(42);
      }
  });

  it("the blues tunes swing two to one; the others are straight", () => {
    expect(stepTime(1, true)).toBeCloseTo(4 / 3);
    expect(stepTime(2, true)).toBe(2);
    expect(stepTime(3, false)).toBe(3);
    expect([...SWUNG].sort()).toEqual(["blues", "blues-major"]);
  });

  it("legato: each tune note rings into the next", () => {
    for (const { q } of questions("mode", 30, 3)) {
      const m = melody(q);
      for (let i = 0; i < m.length - 1; i++) expect(m[i].at + m[i].dur).toBeGreaterThan(m[i + 1].at);
    }
  });

  it("the drone sits under the tune: quieter than every melody note", () => {
    for (const g of ["quality", "mode", "family"] as GameId[])
      for (const { q } of questions(g, 40)) {
        const drone = q.prompt.events.filter((e) => !e.melody && e.midis.length === 2);
        expect(drone.length).toBeGreaterThan(0);
        const quietest = Math.min(...melody(q).map((e) => e.vel));
        for (const d of drone) expect(d.vel).toBeLessThan(quietest);
      }
  });
});

describe("levels", () => {
  it("every game has levels, easiest first, and each level has a name and a line", () => {
    for (const g of GAMES) {
      expect(levelCount(g.id)).toBeGreaterThanOrEqual(3);
      for (const l of LEVELS[g.id]) { expect(l.name.length).toBeGreaterThan(0); expect(l.line.length).toBeGreaterThan(0); }
    }
    expect(clampLevel("mode", 99)).toBe(3);
    expect(clampLevel("mode", 0)).toBe(1);
    expect(clampLevel("family", 4)).toBe(4);
  });

  it("choices grow (or the help shrinks) as levels rise", () => {
    for (const g of GAMES) {
      const counts: number[] = [];
      for (let l = 1; l <= levelCount(g.id); l++) {
        const q = makeQuestion(g.id, { ...DEFAULT_OPTIONS, level: l }, null, seeded(l));
        expect(q.level).toBe(l);
        counts.push(q.choices.length);
      }
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it("missing: level 1 is major up and down, level 2 adds minor, level 3 scrambles", () => {
    expect(MISSING_LEVELS.map((l) => l.order)).toEqual(["updown", "up", "scrambled"]);
    for (const { q } of questions("missing", 40, 1)) {
      expect(q.facts.parent).toBe("major");
      const order = q.facts.order as number[];
      expect(order.length).toBe(13);                                  // 6 up, the octave, 6 down
      expect(order[order.length - 1]).toBe(0);
    }
    const parents = new Set([...questions("missing", 60, 2)].map(({ q }) => q.facts.parent));
    expect(parents).toEqual(new Set(["major", "minor"]));
  });

  it("accents: level 1 asks 3 or 4; the top level has no melody", () => {
    expect(ACCENT_LEVELS[0].groups).toEqual([3, 4]);
    for (const { q } of questions("accents", 40, 1)) expect(["3", "4"]).toContain(q.answer);
    for (const { q } of questions("accents", 20, 3))
      expect(new Set(melody(q).map((e) => e.midis[e.midis.length - 1])).size).toBe(1);
  });
});

describe("progress: levels unlock after a streak", () => {
  it(`${UNLOCK_STREAK} right in a row on the top open level opens the next`, () => {
    let p = freshProgress();
    for (let i = 0; i < UNLOCK_STREAK - 1; i++) {
      const r = recordAnswer("mode", p, true, 1);
      expect(r.unlocked).toBeNull();
      p = r.progress;
    }
    const r = recordAnswer("mode", p, true, 1);
    expect(r.unlocked).toBe(2);
    expect(r.progress.unlocked).toBe(2);
    expect(r.progress.toward).toBe(0);
    expect(r.progress.streak).toBe(UNLOCK_STREAK);
    expect(r.progress.right).toBe(UNLOCK_STREAK);
  });

  it("a wrong answer starts the count again; practice on a lower level does not count", () => {
    let p = { ...freshProgress(), unlocked: 2, toward: 3, streak: 3 };
    p = recordAnswer("mode", p, false, 2).progress;
    expect(p.toward).toBe(0);
    expect(p.streak).toBe(0);
    for (let i = 0; i < 10; i++) p = recordAnswer("mode", p, true, 1).progress;
    expect(p.unlocked).toBe(2);
    expect(p.best).toBe(10);
  });

  it("nothing opens past the last level", () => {
    let p = { ...freshProgress(), unlocked: 3, level: 3 };
    for (let i = 0; i < 20; i++) {
      const r = recordAnswer("mode", p, true, 3);
      expect(r.unlocked).toBeNull();
      p = r.progress;
    }
    expect(p.unlocked).toBe(3);
  });

  it("saved progress loads safely, whatever was stored", () => {
    expect(loadProgress(null).mode).toEqual(freshProgress());
    expect(loadProgress("not json").mode).toEqual(freshProgress());
    const back = loadProgress(JSON.stringify({ mode: { unlocked: 9, level: 7, right: 50, total: 20, toward: 99 } }));
    expect(back.mode.unlocked).toBe(3);
    expect(back.mode.level).toBe(3);
    expect(back.mode.right).toBe(20);                                  // never more right than asked
    expect(back.mode.toward).toBe(UNLOCK_STREAK - 1);
    // the old score-only save still counts
    const legacy = loadProgress(null, JSON.stringify({ quality: { right: 4, total: 6, streak: 2, best: 3 } }));
    expect(legacy.quality).toMatchObject({ right: 4, total: 6, streak: 2, best: 3, unlocked: 1 });
  });
});

describe("the session summary", () => {
  it(`is ${SESSION_LENGTH} questions, and names the pair you mix up most`, () => {
    expect(SESSION_LENGTH).toBe(10);
    const s = summarise("mode", [
      { answer: "min-no6", pick: "dark" }, { answer: "dark", pick: "min-no6" },
      { answer: "maj-no4", pick: "folk" }, { answer: "sus", pick: "sus" },
      ...Array.from({ length: 6 }, () => ({ answer: "maj-no4", pick: "maj-no4" })),
    ]);
    expect(s.right).toBe(7);
    expect(s.total).toBe(10);
    expect(s.confusions[0]).toMatchObject({ a: "dark", b: "min-no6", count: 2 });
    expect(s.confusions[0].line).toBe("You mix up Dark minor (no 2) and Minor (no 6) (2 times).");
    // the tell is computed: Dark minor has the ♭6, Minor (no 6) has the 2
    expect(s.confusions[0].tip).toBe("Listen for the ♭6: Dark minor (no 2) has it, Minor (no 6) has the 2 instead.");
  });

  it("mode tips name the 3rd when the two differ by more than a note or two", () => {
    expect(confusionTip("mode", "maj-no4", "min-no6"))
      .toBe("Listen to the 3rd first: Major (no 4) has the 3, Minor (no 6) has the ♭3.");
    expect(confusionTip("mode", "maj-no4", "folk"))
      .toBe("Listen for the 7: Major (no 4) has it, Sunday Scale (no 7) has the 4 instead.");
    expect(confusionTip("mode", "dark", "unstable"))
      .toBe("Listen for the 5: Dark minor (no 2) has it, Unstable (no 5th) has the ♭2 instead.");
  });

  it("every pair in every game gets a tip with no gaps in it", () => {
    for (const g of GAMES)
      for (let l = 1; l <= levelCount(g.id); l++) {
        const q = makeQuestion(g.id, { ...DEFAULT_OPTIONS, level: l }, null, seeded(l + 3));
        for (const a of q.choices) for (const b of q.choices) {
          if (a.id === b.id) continue;
          const tip = confusionTip(g.id, a.id, b.id);
          expect(tip.length, `${g.id} ${a.id}/${b.id}`).toBeGreaterThan(20);
          expect(tip).not.toMatch(/undefined|NaN|\{|\}/);
        }
      }
  });

  it("the accent tip counts the soft notes correctly", () => {
    expect(confusionTip("accents", "5", "4"))
      .toBe("Count the soft notes between two loud ones: groups of 4 have 3, groups of 5 have 4.");
  });

  it("a clean session has no confusions", () => {
    expect(summarise("quality", Array.from({ length: 10 }, () => ({ answer: "major", pick: "major" }))).confusions).toEqual([]);
  });
});
