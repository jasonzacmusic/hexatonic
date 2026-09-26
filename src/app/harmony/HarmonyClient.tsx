"use client";

import { useEffect, useState } from "react";
import PairAtlas from "@/components/PairAtlas";
import ChordsTab from "./ChordsTab";
import SixthDimTab from "./SixthDimTab";

type Tab = "chords" | "pairs" | "sixth";

const TABS: [Tab, string][] = [
  ["chords", "Chords in the scale"],
  ["pairs", "Two-triad pairs"],
  ["sixth", "Sixth–diminished"],
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

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-2xl pt-2">
        <h1 className="display mt-3 text-4xl sm:text-5xl">Harmony</h1>
        <p className="lede mt-4">
          The chords hiding in any six-note scale, the triad pairs that make one, and a way to put
          a chord under every note.
        </p>
      </header>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="seg w-max" role="tablist" aria-label="Harmony sections">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" data-on={tab === id} aria-selected={tab === id}
                    onClick={() => choose(id)}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "chords" && <ChordsTab />}
      {tab === "pairs" && <PairAtlas onOpenSixth={() => choose("sixth")} />}
      {tab === "sixth" && <SixthDimTab />}
    </div>
  );
}
