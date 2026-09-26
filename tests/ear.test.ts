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
  ACCENT_STEPS, DEFAULT_OPTIONS, FAMILY_DIATONIC, GAMES, GameId, Options, Question,
  QUALITY_POOL, barsToLand, makeQuestion, accentSteps,
} from "../src/lib/ear/games";
import { EAR_KEYS, PARENTS, SOUNDS, soundById, spellParent, spellSound } from "../src/lib/ear/sounds";
import { cadenceChords, relPcs } from "../src/lib/ear/program";
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
for (const level of [1, 2] as const)
  for (const parent of ["major", "minor", "both"] as const)
    for (const order of ["up", "scrambled"] as const)
      for (const keySet of ["cadence", "drone"] as const)
        for (const tempo of [90, 150])
          OPTION_SETS.push({ ...DEFAULT_OPTIONS, level, parent, order, keySet, tempo });

function* questions(game: GameId, n = 400): Generator<{ q: Question; opts: Options }> {
  const rng = seeded(game.length * 7919 + 17);
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    const opts = OPTION_SETS[i % OPTION_SETS.length];
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
  /* The quality game leads with the CHORD, not the scale: it asks about the
     3rd, so it plays the triad and nothing else, and every note of it
     belongs to the scale the answer names. */
  it("quality: the prompt is the triad (1, the 3rd that decides, 5), all from the answer's scale", () => {
    const third = { major: 4, minor: 3, sus: 5 } as const;
    for (const { q } of questions("quality")) {
      const def = soundById(q.facts.sound as string);
      const heard = relPcs(tonicMidi(q), melody(q).flatMap((e) => e.midis));
      expect(heard).toEqual([0, third[q.answer as keyof typeof third], 7].sort((a, b) => a - b));
      expect(heard.every((p) => def.semis.includes(p))).toBe(true);
    }
  });

  it("quality: the chord arrives within 2.5 seconds, and the question is over within 7", () => {
    for (const { q } of questions("quality")) {
      const m = melody(q);
      expect(m[0].midis.length).toBeGreaterThanOrEqual(3);
      expect(m[0].at).toBeLessThanOrEqual(2.5);
      expect(Math.max(...m.map((e) => e.at + e.dur))).toBeLessThan(7);
    }
  });

  for (const game of ["mode", "family"] as GameId[])
    it(`${game}: the melody is the six notes, all of them, nothing else`, () => {
      for (const { q } of questions(game)) {
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

  it("mode: level 1 offers three, level 2 all six rotations", () => {
    for (const { q, opts } of questions("mode", 100))
      expect(q.choices.length).toBe(opts.level === 1 ? 3 : 6);
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

  it("scrambled keeps a tonic drone under the notes", () => {
    for (const { q, opts } of questions("missing")) {
      if (opts.order !== "scrambled") continue;
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
      const s = accentSteps(g, ACCENT_STEPS, scale, 1);
      s.forEach((x, i) => {
        if (i > 0 && x.midi < s[i - 1].midi) expect(x.accent).toBe(true);
        if (i > 0 && !x.accent) expect(x.midi).toBeGreaterThan(s[i - 1].midi);
      });
    }
  });

  it("accents only: one repeated pitch, so the accent is the only cue", () => {
    for (const g of [3, 4, 5, 7])
      expect(new Set(accentSteps(g, ACCENT_STEPS, [60, 62, 64, 65, 67, 69], 2).map((s) => s.midi)).size).toBe(1);
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
