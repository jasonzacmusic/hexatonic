import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import {
  CardSpec, PAGES, PageId, cardQuery, pageFor, parseCard, scaleFace, scoreText, shareLink, GAME_TITLES,
} from "../src/lib/share";
import { GAMES } from "../src/lib/ear/games";
import { RANKS } from "../src/lib/ear/progress";
import { FAMILIES, KEYS, buildScale } from "../src/lib/theory/scales";
import { pc } from "../src/lib/theory/note";

const parse = (qs: string) => parseCard(new URLSearchParams(qs));

describe("page shares", () => {
  it("every page with share copy is a real page", () => {
    for (const p of Object.values(PAGES)) {
      const dir = p.path === "/" ? "src/app" : `src/app${p.path}`;
      expect(existsSync(`${dir}/page.tsx`), p.path).toBe(true);
      expect(p.text.length).toBeGreaterThan(20);
    }
  });

  it("the path picks its page; unknown paths share the home page", () => {
    expect(pageFor("/ear")).toBe("ear");
    expect(pageFor("/practice")).toBe("practice");
    expect(pageFor("/nope")).toBe("home");
    expect(pageFor("/")).toBe("home");
  });
});

describe("card parameters", () => {
  it("round-trip: a spec survives its own link", () => {
    const specs: CardSpec[] = [
      { kind: "page", page: "harmony" },
      { kind: "scale", key: "F#", family: "diatonic", mode: 4, custom: "" },
      { kind: "scale", key: "Bb", family: "blues", mode: 0, custom: "" },
      { kind: "score", game: "missing", score: 8, total: 10, streak: 5, rank: "Keen ear" },
    ];
    for (const s of specs) for (const f of ["og", "post", "story"] as const) {
      const r = parse(cardQuery(s, f));
      expect(r.spec).toEqual(s);
      expect(r.format).toBe(f);
    }
  });

  it("junk never reaches the image: unknown ids fall back, numbers are clamped", () => {
    expect(parse("kind=score&g=<script>&s=999&n=10&r=Grand%20Master").spec)
      .toEqual({ kind: "score", game: "quality", score: 0, total: 10, streak: 0, rank: "" });
    expect(parse("kind=score&g=mode&s=-3&n=10").spec).toMatchObject({ score: 0 });
    expect(parse("kind=scale&k=H&f=zzz&m=99&cs=!!").spec)
      .toEqual({ kind: "scale", key: "C", family: "diatonic", mode: 0, custom: "" });
    expect(parse("kind=page&page=../../etc").spec).toEqual({ kind: "page", page: "home" });
    expect(parse("").format).toBe("og");
  });

  it("the card knows every ear game and every rank", () => {
    for (const g of GAMES) expect(GAME_TITLES[g.id]).toBe(g.title);
    for (const r of RANKS) expect(parse(`kind=score&g=mode&s=1&n=10&r=${encodeURIComponent(r.name)}`).spec)
      .toMatchObject({ rank: r.name });
  });
});

describe("scale cards", () => {
  it("say the scale the app builds, in every key and family", () => {
    for (const key of KEYS) for (const fam of FAMILIES.filter((f) => f.id !== "custom")) {
      const face = scaleFace({ kind: "scale", key, family: fam.id, mode: 0, custom: "" });
      expect(face.notes.length).toBe(fam.size);
      expect(face.name).not.toMatch(/undefined/);
    }
  });

  it("the card marks the same removed note the app's keyboard does", () => {
    for (const key of KEYS) for (let mode = 0; mode < 6; mode++) {
      const face = scaleFace({ kind: "scale", key, family: "diatonic", mode, custom: "" });
      const s = buildScale(key, "diatonic", mode);
      expect(face.removedPc).toBe(s.removed ? pc(s.removed) : null);
    }
    const face = scaleFace({ kind: "scale", key: "C", family: "diatonic", mode: 4, custom: "" });
    expect(face.notes.join(" ")).toBe("C D E♭ F G B♭");
    expect(face.practice).toBe("/practice?k=C&f=diatonic&m=4");
  });
});

describe("the words", () => {
  it("a score reads cleanly at every level", () => {
    for (const s of [0, 5, 6, 8, 10]) {
      const t = scoreText("missing", s, 10, 4, "Listener");
      expect(t).toContain(`${s}/10`);
      expect(t).toContain("Which note is missing?");
      expect(t).not.toMatch(/undefined|NaN/);
    }
    expect(scoreText("quality", 10, 10, 10, "")).toContain("Perfect set.");
  });

  it("links point at the live site", () => {
    expect(shareLink({ kind: "page", page: "sounds" })).toBe("https://hexatonic.nathanielschool.com/sounds");
    expect(shareLink({ kind: "score", game: "mode", score: 7, total: 10, streak: 0, rank: "" }))
      .toBe("https://hexatonic.nathanielschool.com/c?kind=score&g=mode&s=7&n=10");
  });
});
