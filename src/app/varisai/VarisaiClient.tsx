"use client";

/**
 * The varisai ladder — the curriculum spine.
 *
 * Modelled on the real Carnatic system rather than an invented one. The
 * structural insight worth stealing, from docs/07-CARNATIC.md §6: levels 1 to 5
 * hold the raga CONSTANT and vary the PATTERN; Alankaram then holds the pattern
 * and varies the TALA. Permute, then re-tala. Everything is practised at three
 * speeds — kala pramanam — which is why tempo doubling is offered here as a
 * locked relationship rather than a slider.
 */

import Link from "next/link";
import { useState } from "react";
import { encodeState, DEFAULTS, DrillState } from "@/lib/useDrill";
import { SAPTA_TALAS, talaAsMeter, aksharas } from "@/lib/theory/meters";
import { RAGAS, buildRaga } from "@/lib/theory/ragas";
import { notePretty } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";
import { midi } from "@/lib/theory/note";

interface Rung {
  n: number;
  name: string;
  also?: string;
  drills: string;
  teaching: string;
  steps: { label: string; state: Partial<DrillState>; note?: string }[];
}

const LADDER: Rung[] = [
  {
    n: 1, name: "Sarali Varisai", drills: "straight ascent and descent, then re-sequenced",
    teaching:
      "Fourteen exercises, traditionally in Mayamalavagaula and Adi tala, practised at three speeds. The variations come from re-ordering the notes, not from changing them.",
    steps: [
      { label: "Plain aroha–avaroha", state: { pattern: "both", sub: 4, grouping: 4 } },
      { label: "In cells of four", state: { pattern: "cells", cell: 4, sub: 4, grouping: 4 } },
      { label: "In cells of three", state: { pattern: "cells", cell: 3, sub: 3, grouping: 3 } },
    ],
  },
  {
    n: 2, name: "Melsthayi Varisai", also: "Ecchusthayi",
    drills: "extends into the upper octave",
    teaching: "Builds range upward. Same material, more of it.",
    steps: [
      { label: "Two octaves up", state: { pattern: "aroha", octaves: 2, sub: 4, grouping: 4 } },
      { label: "Two octaves, up and down", state: { pattern: "both", octaves: 2, sub: 3, grouping: 4 } },
    ],
  },
  {
    n: 3, name: "Mandrasthayi Varisai", also: "Thaggusthayi",
    drills: "the mirror image, downward",
    teaching: "The same exercise inverted. Descending is harder and gets less practice, which is exactly why it has its own rung.",
    steps: [
      { label: "Descending, two octaves", state: { pattern: "avaroha", octaves: 2, sub: 4, grouping: 4 } },
      { label: "Cells running down", state: { pattern: "cellsDown", cell: 4, sub: 4, grouping: 4 } },
    ],
  },
  {
    n: 4, name: "Janta Varisai", drills: "paired notes",
    teaching:
      "Janta means twin. Every note of the sarali is sung twice, then later three times. It builds attack and, in Carnatic singing, gamaka control.",
    steps: [
      { label: "Paired, straight", state: { pattern: "cells", cell: 3, sub: 3, grouping: 3 },
        note: "Cells of three at triplet speed approximate the doubled attack." },
      { label: "Paired, faster", state: { pattern: "cells", cell: 3, sub: 6, grouping: 6 } },
    ],
  },
  {
    n: 5, name: "Dhatu Varisai", drills: "zigzag permutations",
    teaching:
      "The direct analogue of Western sequence practice — in thirds, in fourths, in fifths. In a six-note scale these produce something no seven-note scale can: stepping three degrees gives a perfect interval every single time.",
    steps: [
      { label: "In thirds", state: { pattern: "thirds", sub: 4, grouping: 4 } },
      { label: "In fourths — all perfect", state: { pattern: "fourths", sub: 4, grouping: 4 } },
      { label: "In fifths", state: { pattern: "fifths", sub: 4, grouping: 4 } },
      { label: "Triad arpeggios", state: { pattern: "triads", sub: 3, grouping: 3 } },
    ],
  },
  {
    n: 6, name: "Alankaram", drills: "the same patterns, across the talas",
    teaching:
      "Here the pattern stops changing and the TALA starts. Traditionally there are 35 — seven talas in five jatis — of which seven are taught first, the Suladi Sapta Tala Alankaras.",
    steps: SAPTA_TALAS.map((t) => ({
      label: `${t.name} (${aksharas(t, t.defaultJati)})`,
      state: { pattern: "both", meter: talaAsMeter(t, t.defaultJati).id, sub: 2, grouping: 4 },
    })),
  },
];

const KALA = [
  { id: 1, label: "1st speed", bpm: 60 },
  { id: 2, label: "2nd speed", bpm: 120 },
  { id: 3, label: "3rd speed", bpm: 180 },
];

export default function VarisaiClient() {
  const [key, setKey] = useState("C");
  const [speed, setSpeed] = useState(1);
  const [ragaId, setRagaId] = useState<string>("");

  const bpm = KALA.find((k) => k.id === speed)!.bpm;
  const link = (partial: Partial<DrillState>) =>
    `/practice?${encodeState({ ...DEFAULTS, key, bpm, ...partial })}`;

  const raga = ragaId ? buildRaga(key, ragaId) : null;

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-2xl pt-2">
        <h1 className="display mt-3 text-4xl">Varisai.</h1>
        <p className="lede mt-4">
          A curriculum rather than a menu. This is the Carnatic exercise ladder, in
          order, with each rung wired to the drill machine. Levels one to five hold the
          scale constant and vary the pattern; the last one holds the pattern and varies
          the tala.
        </p>
      </header>

      <section className="card">
        <div className="flex flex-wrap items-end gap-5">
          <div className="field">
            <label htmlFor="k">Key / Sa</label>
            <select id="k" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {["C","G","D","A","E","B","F#","Db","Ab","Eb","Bb","F"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Kala pramanam</label>
            <div className="seg">
              {KALA.map((k) => (
                <button key={k.id} data-on={speed === k.id} onClick={() => setSpeed(k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <p className="quiet max-w-sm">
            Three speeds, each double the last — {bpm} bpm. The tradition gears up by
            doubling, not by nudging a slider.
          </p>
        </div>
      </section>

      {LADDER.map((r) => (
        <section key={r.n} className="card">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <span className="num text-3xl text-gold/50">{String(r.n).padStart(2, "0")}</span>
            <h2 className="display text-2xl">{r.name}</h2>
            {r.also && <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
              also {r.also}</span>}
          </div>
          <p className="mt-1 font-mono text-[12px] tracking-[0.02em] text-muted">
            {r.drills}
          </p>
          <p className="quiet mt-3 max-w-[68ch]">{r.teaching}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.steps.map((st, i) => (
              <Link key={i} href={link(st.state)}
                className="rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm transition hover:border-gold/60">
                {st.label} <span className="ml-1 text-gold">→</span>
              </Link>
            ))}
          </div>
          {r.steps.some((s) => s.note) && (
            <p className="quiet mt-3">{r.steps.find((s) => s.note)!.note}</p>
          )}
        </section>
      ))}

      {/* ── ragas ─────────────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="display mt-2 text-2xl">When up and down are different.</h2>
        <p className="quiet mt-3 max-w-[68ch]">
          Every scale elsewhere in this app has one note list, because a Western scale
          ascends and descends through the same notes. A raga need not. Its arohana and
          avarohana can hold different notes, and a <em>vakra</em> raga does not move in
          a straight line at all — it doubles back.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="field min-w-[260px]">
            <label htmlFor="r">Raga</label>
            <select id="r" className="sel" value={ragaId} onChange={(e) => setRagaId(e.target.value)}>
              <option value="">Choose one…</option>
              {RAGAS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} — {x.jati.replace("-", " / ")}
                </option>
              ))}
            </select>
          </div>
          {raga && !raga.error && (
            <button className="btn btn-primary"
              onClick={() => previewAudio(
                [...raga.arohana, ...raga.avarohana].map((n) => midi(n) + 12), 0.2)}>
              ▶ Aroha then avaroha
            </button>
          )}
        </div>

        {raga && !raga.error && (
          <div className="mt-5 space-y-3">
            <Row label="Arohana" notes={raga.arohana.map(notePretty).join("  ")} />
            <Row label="Avarohana" notes={raga.avarohana.map(notePretty).join("  ")} />
            {raga.ascentOnly.length > 0 && (
              <p className="text-sm">
                <span className="text-muted">Only in the ascent:</span>{" "}
                <span className="text-gold">{raga.ascentOnly.map(notePretty).join(" ")}</span>
              </p>
            )}
            {raga.descentOnly.length > 0 && (
              <p className="text-sm">
                <span className="text-muted">Only in the descent:</span>{" "}
                <span className="text-gold">{raga.descentOnly.map(notePretty).join(" ")}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12px] tracking-[0.02em] text-muted">
              <span>{raga.raga.jati.replace("-", " / ")}</span>
              {raga.raga.parent && <span>parent: {raga.raga.parent}</span>}
              {raga.raga.varjya && <span>{raga.raga.varjya} varjya</span>}
              {raga.raga.vakra && <span className="text-gold">vakra</span>}
              <span>{raga.raga.tradition}</span>
            </div>
            <p className="quiet max-w-[68ch]">{raga.raga.note}</p>
            {raga.raga.caveat && (
              <p className="rounded-lg border border-amber/40 bg-amber/[0.07] px-4 py-2.5 text-sm text-amber">
                {raga.raga.caveat}
              </p>
            )}
          </div>
        )}
        <p className="quiet mt-5">
          Every raga here comes from a verified list. Where a source could not be
          confirmed the app stays quiet rather than guessing — and one common
          assumption is wrong: <strong className="text-cream">Sriranjani is not the
          minor hexatonic</strong>. It is panchama-varjya, the opposite.
        </p>
      </section>
    </div>
  );
}

function Row({ label, notes }: { label: string; notes: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-4">
      <span className="w-24 shrink-0 font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="font-mono text-xl text-gold">{notes}</span>
    </div>
  );
}
