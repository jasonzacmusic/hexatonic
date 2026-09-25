"use client";

/**
 * The six-note scales the Harmony page works on, and the picker for them.
 * Built from the scale families the app actually has, so a family that leaves
 * the library simply leaves this menu too.
 */

import { buildScale, DIATONIC_MODES, FAMILIES, KEYS, ScaleInstance } from "@/lib/theory/scales";

export interface ScaleOption {
  id: string;
  label: string;
  build: (key: string) => ScaleInstance;
}

export const prettyDegrees = (d: string) => d.replace(/b/g, "♭").replace(/#/g, "♯");

const has = (id: string) => FAMILIES.some((f) => f.id === id);

export const SCALE_OPTIONS: ScaleOption[] = [
  ...DIATONIC_MODES.map((m) => ({
    id: `d${m.index}`,
    label: `${m.name} · ${prettyDegrees(m.degrees)}`,
    build: (key: string) => buildScale(key, "diatonic", m.index),
  })),
  {
    id: "minor-no7",
    label: "Minor, no 7th · 1 2 ♭3 4 5 6",
    build: (key: string) => ({ ...buildScale(key, "custom", 0, [0, 2, 3, 5, 7, 9]), label: "Minor, no 7th" }),
  },
  ...["mixo", "blues", "blues-major", "whole", "aug"].filter(has).map((id) => ({
    id,
    label: FAMILIES.find((f) => f.id === id)!.short,
    build: (key: string) => buildScale(key, id, 0),
  })),
];

export const optionById = (id: string) => SCALE_OPTIONS.find((o) => o.id === id) ?? SCALE_OPTIONS[0];

export function ScalePicker({
  idPrefix, keyName, setKey, optionId, setOption, options = SCALE_OPTIONS,
}: {
  idPrefix: string;
  keyName: string;
  setKey: (k: string) => void;
  optionId: string;
  setOption: (id: string) => void;
  options?: ScaleOption[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="field">
        <label htmlFor={`${idPrefix}-key`}>Key</label>
        <select id={`${idPrefix}-key`} className="sel" value={keyName} onChange={(e) => setKey(e.target.value)}>
          {KEYS.map((k) => <option key={k} value={k}>{prettyDegrees(k)}</option>)}
        </select>
      </div>
      <div className="field min-w-0 flex-1 sm:min-w-[300px] sm:flex-none">
        <label htmlFor={`${idPrefix}-scale`}>Scale</label>
        <select id={`${idPrefix}-scale`} className="sel" value={optionId} onChange={(e) => setOption(e.target.value)}>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

/** Explanatory prose: 15px, cream at 75% or brighter (the legibility floor). */
export const PROSE = "max-w-[68ch] text-[15px] leading-relaxed text-cream/80";
