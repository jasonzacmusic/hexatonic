/**
 * Every page that is about scales offers every scale and every mode, grouped
 * the same way, from one shared menu (src/lib/scaleMenu.ts, drawn by
 * src/components/ScaleModePicker.tsx). A page may grey a scale out only where
 * it makes no musical sense there, and then it says why. The exceptions below
 * are the whole list, and docs/scale-coverage.md repeats them.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FAMILIES, familyById, menuGroupLabel, modeCount, SIX_NOTE_GROUPS } from "../src/lib/theory/scales";
import { menuGroups, modeOrder, PAGE_EXCLUDE, pageEntries, PageId, PICKER_GROUPS, stepMode } from "../src/lib/scaleMenu";
import { decodeState } from "../src/lib/useDrill";
import { isLibraryScale } from "../src/lib/sharedScale";

const ALL = FAMILIES.flatMap((f) => Array.from({ length: modeCount(f) }, (_, m) => `${f.id}:${m}`));

/** The documented exceptions: page → family → why. Everything else is offered. */
const EXCEPTIONS: Record<PageId, string[]> = {
  practice: [],
  sounds: ["custom"],
  improvise: ["custom"],
  ear: ["custom"],
  chords: ["custom"],
  pairs: ["custom", "penta", "hepta", "harm-minor", "mel-minor", "dim-wh", "dim-hw",
    "hirajoshi", "insen", "iwato", "kumoi", "yo", "hijaz"],
};

describe("every page's scale menu", () => {
  it("the library has the modes the menus promise", () => {
    expect(modeCount(familyById("diatonic"))).toBe(6);
    expect(modeCount(familyById("hepta"))).toBe(7);
    expect(modeCount(familyById("harm-minor"))).toBe(7);
    expect(modeCount(familyById("mel-minor"))).toBe(7);
    expect(modeCount(familyById("penta"))).toBe(5);
    expect(ALL.length).toBe(FAMILIES.reduce((n, f) => n + modeCount(f), 0));
  });

  for (const page of Object.keys(PAGE_EXCLUDE) as PageId[]) {
    it(`${page}: lists every family × mode, and greys out only the documented ones, with a reason`, () => {
      const got = pageEntries(page);
      expect(got.map((e) => `${e.family}:${e.mode}`).sort()).toEqual([...ALL].sort());
      const greyed = [...new Set(got.filter((e) => e.reason).map((e) => e.family))].sort();
      expect(greyed).toEqual([...EXCEPTIONS[page]].sort());
      for (const e of got.filter((x) => x.reason)) {
        expect(e.reason!.length, `${page} ${e.family}`).toBeGreaterThan(15);
        expect(e.reason!.length).toBeLessThan(110);   // one line
      }
    });
  }

  it("groups the same way everywhere: six-note headings first, from menuGroupLabel", () => {
    const labels = menuGroups().map((g) => g.label);
    expect(labels.slice(0, SIX_NOTE_GROUPS.length).every((l) => l.startsWith("Six notes"))).toBe(true);
    expect(labels).toEqual(PICKER_GROUPS.filter((g) => FAMILIES.some((f) => f.group === g)).map(menuGroupLabel));
  });

  it("each page draws the shared picker, not a menu of its own", () => {
    const files: Record<string, string> = {
      practice: "src/app/practice/PracticeClient.tsx",
      sounds: "src/app/sounds/SoundsClient.tsx",
      improvise: "src/app/improvise/ImproviseClient.tsx",
      ear: "src/app/ear/EarClient.tsx",
      chords: "src/app/harmony/ChordsTab.tsx",
      pairs: "src/components/PairAtlas.tsx",
    };
    for (const [page, path] of Object.entries(files)) {
      const src = readFileSync(path, "utf8");
      expect(src, path).toContain("ScaleModePicker");
      expect(src, path).toContain(`page="${page}"`);
      expect(src, path).not.toMatch(/menuGroupLabel\(|familiesIn\(g/);
    }
  });
});

describe("the mode strip", () => {
  it("the Sunday-Scale shape reads in Jason's order: Sunday, Minor, Phrygian, Major, Suspended, Dark minor", () => {
    const f = familyById("diatonic");
    expect(modeOrder(f).map((m) => f.modes![m].name)).toEqual([
      "Sunday Scale (no 7)", "Minor (no 6)", "Phrygian (no 5th)", "Major (no 4)", "Suspended (no 3rd)", "Dark minor (no 2)",
    ]);
    expect(modeOrder(f).map((m) => f.modes![m].missing)).toEqual(["7", "6", "5", "4", "b3", "2"]);
  });

  it("each chip in that order starts on the next note of the Sunday Scale (the same six notes)", () => {
    const sunday = [0, 2, 4, 5, 7, 9];
    modeOrder(familyById("diatonic")).forEach((m, i) => {
      const degs = familyById("diatonic").modes![m].degrees.split(" ");
      const SEMI: Record<string, number> = { "1": 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11 };
      const rotated = sunday.map((s) => (s - sunday[i] + 12) % 12).sort((a, b) => a - b);
      expect(degs.map((d) => SEMI[d]), `chip ${i + 1}`).toEqual(rotated);
    });
  });

  it("← and → step every family round all its modes and wrap", () => {
    for (const f of FAMILIES) {
      const seen = new Set<number>();
      let m = modeOrder(f)[0];
      for (let i = 0; i < modeCount(f); i++) { seen.add(m); m = stepMode(f, m, 1); }
      expect(seen.size, f.id).toBe(modeCount(f));
      expect(m).toBe(modeOrder(f)[0]);
      expect(stepMode(f, stepMode(f, 0, 1), -1)).toBe(0);
    }
  });

  it("a link or a remembered scale can reach every mode (m=0…6)", () => {
    for (const f of FAMILIES) for (let m = 0; m < modeCount(f); m++) {
      if (f.kind !== "custom") expect(isLibraryScale(f.id, m), `${f.id}:${m}`).toBe(true);
      const st = decodeState(`k=G&f=${f.id}&m=${m}&v=2`);
      expect([st.family, st.mode], `${f.id}:${m}`).toEqual([f.id, m]);
    }
    expect(isLibraryScale("hepta", 7)).toBe(false);
  });
});
