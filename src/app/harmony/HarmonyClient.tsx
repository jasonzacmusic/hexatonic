"use client";

import { useEffect, useState } from "react";
import PairAtlas from "@/components/PairAtlas";
import ChordsTab from "./ChordsTab";
import SixthDimTab from "./SixthDimTab";

type Tab = "chords" | "pairs" | "sixth";

/** Each tab, with one plain line on what it is for. */
const TABS: { id: Tab; label: string; line: string }[] = [
  { id: "chords", label: "Chords in the scale",
    line: "Every chord the scale's own notes can make, and what each one does." },
  { id: "pairs", label: "Two-triad pairs",
    line: "Two three-note chords that together give you all six notes." },
  { id: "sixth", label: "Sixth–diminished",
    line: "A chord under every note: a sixth chord, then a diminished one between." },
];

/* Old deep links keep working: ?tab=triads, atlas, movement, barry. */
const ALIAS: Record<string, Tab> = {
  chords: "chords", triads: "chords",
  pairs: "pairs", atlas: "pairs", movement: "pairs",
  sixth: "sixth", barry: "sixth",
};

export default function HarmonyClient() {
  const [tab, setTab] = useState<Tab>("chords");
  useEffect(() => {
    const t = ALIAS[new URLSearchParams(window.location.search).get("tab") ?? ""];
    if (t) setTab(t);
  }, []);
  const choose = (t: Tab) => {
    setTab(t);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", t);
      window.history.replaceState(null, "", u);
    } catch { /* the tab still changes */ }
  };
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-5 pb-10">
      <header className="max-w-2xl">
        <h1 className="display text-[40px] leading-none tracking-[-0.03em] sm:text-5xl">Harmony</h1>
        <p className="mt-3 max-w-[62ch] text-[17px] leading-[1.5] text-cream/85 sm:text-[18px]">
          The chords hiding in any six-note scale, the triad pairs that make one, and a way to put
          a chord under every note.
        </p>
      </header>

      <div>
        {/* The picked tab is cream with a bright rule, never gold: gold on this
            page means only "sounding now". */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1"
             role="tablist" aria-label="Harmony sections">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={on} aria-controls="harmony-panel"
                      onClick={() => choose(t.id)}
                      className={`relative rounded-xl px-2.5 py-2 text-left transition-colors duration-150 sm:px-4 sm:py-2.5 ${
                        on ? "bg-surface2 text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-muted hover:bg-white/[0.03] hover:text-cream"}`}>
                <span className={`absolute inset-x-3 top-0 h-[2px] rounded-full transition-opacity ${on ? "bg-cream opacity-90" : "opacity-0"}`} />
                <span className="block text-[15px] font-bold leading-tight tracking-[-0.005em] sm:text-[16px]">{t.label}</span>
                <span className={`mt-0.5 hidden text-[13px] leading-snug sm:block ${on ? "text-cream/75" : "text-muted"}`}>{t.line}</span>
              </button>
            );
          })}
        </div>
        {/* On a phone the three lines do not fit in the tabs: show the picked one. */}
        <p className="mt-2 px-1 text-[15px] leading-snug text-cream/75 sm:hidden">{active.line}</p>
      </div>

      <div id="harmony-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "chords" && <ChordsTab />}
        {tab === "pairs" && <PairAtlas />}
        {tab === "sixth" && <SixthDimTab />}
      </div>
    </div>
  );
}
