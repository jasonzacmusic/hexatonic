import { describe, expect, it } from "vitest";
import { DEFAULTS, decodeState, encodeState, type DrillState } from "../src/lib/useDrill";

describe("share-link state", () => {
  it("round-trips every supported field", () => {
    const state: DrillState = {
      key: "F#", family: "diatonic", mode: 4, pattern: "cells", cell: 6,
      octaves: 3, includeTop: true, sub: 6, grouping: 9, resolve: "accent", meter: "7-8",
      bpm: 137, loop: false, click: false,
    };
    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it("rejects malformed and out-of-range URL values", () => {
    const decoded = decodeState(
      "k=H&f=missing&m=99&p=bad&c=0&o=12&t=maybe&s=0&g=8&r=nope&b=NaN&l=2&x=-1"
    );
    expect(decoded).toEqual(DEFAULTS);
  });

  it("forces non-rotating scale families back to mode zero", () => {
    expect(decodeState("f=whole&m=5").mode).toBe(0);
  });
});
