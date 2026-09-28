import { describe, expect, it } from "vitest";
import { isLibraryScale, parseShared } from "../src/lib/sharedScale";
import { optionToShared, SCALE_OPTIONS, sharedToOption } from "../src/app/harmony/scaleOptions";

describe("the scale follows you between pages", () => {
  it("reads a remembered scale and rejects junk", () => {
    expect(parseShared('{"key":"D","family":"diatonic","mode":2}')).toEqual({ key: "D", family: "diatonic", mode: 2 });
    expect(parseShared('{"key":"H"}')).toBeNull();
    expect(parseShared("not json")).toBeNull();
    expect(parseShared(null)).toBeNull();
  });

  it("every Harmony menu option survives the round trip", () => {
    for (const o of SCALE_OPTIONS) {
      const s = optionToShared(o.id);
      expect(sharedToOption(s.family, s.mode)).toBe(o.id);
    }
  });

  it("knows which scales the Practice page can build", () => {
    expect(isLibraryScale("diatonic", 3)).toBe(true);
    expect(isLibraryScale("hirajoshi", 0)).toBe(true);
    expect(isLibraryScale("diatonic", 9)).toBe(false);
    expect(isLibraryScale("minor-no7", 0)).toBe(false);
    expect(isLibraryScale("custom", 0)).toBe(false);
  });
});
