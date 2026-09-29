"use client";

/**
 * The one scale picker every page uses.
 *
 *   · a menu of every family in the library, grouped the same way everywhere
 *     (six-note scales first, headings from menuGroupLabel). A family this
 *     page cannot use is still listed, greyed out, with its one-line reason;
 *   · under it, the mode strip: for every family with modes, one chip per
 *     mode (1 … n, with its name), one tap away, never buried in a menu;
 *   · ← and → step through the modes on pages that ask for it (`arrowKeys`),
 *     unless a text field, a menu or a radio group has the focus.
 *
 * What is listed, in what order, and why something is greyed out all come
 * from src/lib/scaleMenu.ts, which tests/scale-coverage.test.ts checks.
 * The picked chip is cream, never gold: gold means only "sounding now".
 */

import { useEffect, useMemo, useRef } from "react";
import { familyById, FamilyGroup, hasModes } from "@/lib/theory/scales";
import { menuGroups, modeOrder, PAGE_EXCLUDE, PageId, stepMode } from "@/lib/scaleMenu";

export interface PickerExtra { value: string; label: string; group: FamilyGroup }

export default function ScaleModePicker({
  idPrefix, page, family, mode, onChange, extras = [], extraValue = null, onExtra,
  arrowKeys = false, label = "Scale", disabled = false, className = "", hideStrip = false,
}: {
  idPrefix: string;
  page: PageId;
  family: string;
  mode: number;
  onChange: (family: string, mode: number) => void;
  /** Hand-built options a page adds to a group (Harmony's "Minor, no 7th"). */
  extras?: PickerExtra[];
  /** The extra that is picked, if any; the strip hides while it is. */
  extraValue?: string | null;
  onExtra?: (value: string) => void;
  arrowKeys?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
  hideStrip?: boolean;
}) {
  const groups = useMemo(() => menuGroups(PAGE_EXCLUDE[page]), [page]);
  const fam = familyById(family);
  const showStrip = !hideStrip && !extraValue && hasModes(fam);

  useModeArrows(family, mode, (m) => onChange(family, m), arrowKeys && !disabled);

  const value = extraValue ?? family;
  const pick = (v: string) => {
    if (extras.some((x) => x.value === v)) { onExtra?.(v); return; }
    onChange(v, 0);
  };
  /* A family the menu does not list (an old link) still shows, so the menu
     never claims a different scale from the one on screen. */
  const listed = extraValue || groups.some((g) => g.families.some((m) => m.family.id === family));

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <div className="field min-w-0">
        <label htmlFor={`${idPrefix}-scale`}>{label}</label>
        <select id={`${idPrefix}-scale`} className="sel w-full sm:w-[300px]" value={value} disabled={disabled}
                onChange={(e) => pick(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g.id} label={g.label}>
              {g.families.map((m) => (
                <option key={m.family.id} value={m.family.id} disabled={!!m.reason}>
                  {m.reason ? `${m.label} — ${m.reason}` : m.label}
                </option>
              ))}
              {extras.filter((x) => x.group === g.id).map((x) => (
                <option key={x.value} value={x.value}>{x.label}</option>
              ))}
            </optgroup>
          ))}
          {!listed && (
            <optgroup label="Other">
              <option value={family}>{fam.short}</option>
            </optgroup>
          )}
        </select>
      </div>
      {showStrip && (
        <ModeStrip idPrefix={idPrefix} family={family} mode={mode} disabled={disabled}
                   arrowKeys={arrowKeys} onPick={(m) => onChange(family, m)} />
      )}
    </div>
  );
}

/** ← and → step through a family's modes, in strip order, unless a text
 *  field, a menu or a radio group (the key chips, the strip itself) has the
 *  focus. Pages with no other use for the arrow keys turn it on. */
export function useModeArrows(family: string, mode: number, onPick: (m: number) => void, enabled = true) {
  const live = useRef({ family, mode, onPick });
  live.current = { family, mode, onPick };
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable
        || t.closest?.('[role="radiogroup"], [role="slider"], [role="tablist"]'))) return;
      const f = familyById(live.current.family);
      if (!hasModes(f)) return;
      e.preventDefault();
      live.current.onPick(stepMode(f, live.current.mode, e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** The modes of one family as a row of numbered chips. A radio group: the
 *  arrow keys move along it when a chip has the focus. */
export function ModeStrip({
  idPrefix, family, mode, onPick, disabled = false, arrowKeys = false,
}: {
  idPrefix: string; family: string; mode: number; onPick: (m: number) => void;
  disabled?: boolean; arrowKeys?: boolean;
}) {
  const f = familyById(family);
  const order = modeOrder(f);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = Math.max(0, order.indexOf(mode));
  const onKey = (e: React.KeyboardEvent) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const n = (at + d + order.length) % order.length;
    refs.current[n]?.focus();
    onPick(order[n]);
  };
  const words = ["", "one", "two", "three", "four", "five", "six", "seven", "eight"];
  const title = f.id === "diatonic" ? "The six moods of one shape" : `The ${words[order.length] ?? order.length} modes`;
  return (
    <div className="min-w-0">
      <p id={`${idPrefix}-modes`} className="micro-caps mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <span>{title}</span>
        {arrowKeys && <span className="hidden normal-case tracking-normal text-muted/80 lg:inline">← → step through them</span>}
      </p>
      <div role="radiogroup" aria-labelledby={`${idPrefix}-modes`} onKeyDown={onKey}
           className="flex flex-wrap gap-1.5">
        {order.map((m, i) => {
          const md = f.modes![m];
          const on = m === mode;
          return (
            <button key={m} ref={(el) => { refs.current[i] = el; }} type="button" role="radio"
                    aria-checked={on} tabIndex={on ? 0 : -1} disabled={disabled}
                    title={`${md.name}: ${md.colour}`}
                    onClick={() => { if (!on) onPick(m); }}
                    className={`flex items-baseline gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[14px] font-semibold leading-tight transition-colors duration-150 disabled:opacity-50 sm:text-[15px] ${
                      on ? "border-cream bg-cream text-bg" : "border-line bg-surface2 text-cream/85 hover:border-cream/45"}`}>
              <span className={`font-mono text-[13px] font-normal ${on ? "text-bg/70" : "text-muted"}`}>{i + 1}</span>
              {md.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
