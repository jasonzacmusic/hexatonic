"use client";

/**
 * Two-triad pairs: the finder, the curated pairs, and the movement lab for
 * whichever pair is chosen. Every fact on screen is computed: whether two
 * triads share a note, how many pairs make a given six notes, and which note
 * each neighbouring pair of a major scale leaves out.
 */

import { useMemo, useState } from "react";
import { previewAudio } from "@/lib/audio/engine";
import MovementLab from "@/components/MovementLab";
import { augmentedPair, triadPair, triadPairsCovering, TriadQuality } from "@/lib/theory/chords";
import { notePretty } from "@/lib/theory/note";
import { KEYS } from "@/lib/theory/scales";
import { InterlockedMovement } from "@/lib/theory/movement";
import {
  adjacentDiatonicPairs, buildAtlasMovement, PAIR_ATLAS, pairMovement,
} from "@/lib/theory/pairAtlas";

const PC_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const PC_ASCII = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const QUALS: { id: TriadQuality; label: string; suffix: string }[] = [
  { id: "maj", label: "major", suffix: "" },
  { id: "min", label: "minor", suffix: "m" },
  { id: "dim", label: "diminished", suffix: "°" },
  { id: "aug", label: "augmented", suffix: "+" },
];
const SHAPE: Record<TriadQuality, number[]> = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const triName = (root: number, q: TriadQuality) => PC_NAMES[root] + QUALS.find((x) => x.id === q)!.suffix;
const pretty = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯");

type Pick = { kind: "atlas"; id: string } | { kind: "custom" };

export default function PairAtlas() {
  /* The finder: G + Am by default, the pair that makes G's no-4 neighbour. */
  const [rootA, setRootA] = useState(7);
  const [qualA, setQualA] = useState<TriadQuality>("maj");
  const [rootB, setRootB] = useState(9);
  const [qualB, setQualB] = useState<TriadQuality>("min");
  const [pick, setPick] = useState<Pick>({ kind: "atlas", id: PAIR_ATLAS[0].id });
  const [key, setKey] = useState("G");

  const pcs = triadPair(rootA, qualA, rootB, qualB);
  const aPcs = SHAPE[qualA].map((i) => (rootA + i) % 12);
  const bPcs = SHAPE[qualB].map((i) => (rootB + i) % 12);
  const shared = aPcs.filter((p) => bPcs.includes(p));
  const covers = useMemo(() => (pcs ? triadPairsCovering(pcs) : []), [pcs?.join()]);

  /* The custom pair as a movement, spelled from the first triad's root. */
  const custom = useMemo<InterlockedMovement | null>(() => {
    if (!pcs) return null;
    const semis = [...new Set([...aPcs, ...bPcs].map((p) => (p - rootA + 12) % 12))].sort((x, y) => x - y);
    try { return pairMovement(PC_ASCII[rootA], semis, 3, `${triName(rootA, qualA)} + ${triName(rootB, qualB)}`); }
    catch { return null; }
  }, [pcs?.join(), rootA, qualA, rootB, qualB]);

  const entry = pick.kind === "atlas" ? PAIR_ATLAS.find((e) => e.id === pick.id) ?? PAIR_ATLAS[0] : null;
  const movement = useMemo<InterlockedMovement | null>(() => {
    if (pick.kind === "custom") return custom;
    try { return buildAtlasMovement(entry!, key); } catch { return null; }
  }, [pick, custom, entry, key]);

  const sameMajor = [1, 2, 6].map((iv) => ({ iv, pcs: triadPair(7, "maj", (7 + iv) % 12, "maj")! }));
  const neighbours = useMemo(() => adjacentDiatonicPairs(key), [key]);
  const spelled = custom?.scale.notes.map(notePretty) ?? (pcs ?? []).map((p) => PC_NAMES[p]);

  return (
    <div className="space-y-5">
      {/* ── the finder ─────────────────────────────────────────────────── */}
      <section className="card">
        <p className="eyebrow">Two triads, six notes</p>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
          Pick two triads. If they share no note, together they make a six-note scale, and the
          two shapes can alternate through every inversion.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <TriadPicker label="First triad" root={rootA} qual={qualA} setRoot={setRootA} setQual={setQualA} />
          <span className="pb-2.5 text-2xl text-muted">+</span>
          <TriadPicker label="Second triad" root={rootB} qual={qualB} setRoot={setRootB} setQual={setQualB} />
        </div>

        {pcs ? (
          <div className="well mt-5 rounded-xl p-4">
            <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">six notes, none shared</p>
            <p className="mt-1 font-mono text-2xl tracking-wide text-cream">{spelled.join("  ")}</p>
            <p className="mt-2 text-[15px] text-cream/80">
              {covers.length === 1
                ? "This is the only pair of triads that makes these six notes."
                : `${covers.length} different pairs of triads make these six notes: ${covers
                    .map((c) => `${triName(c.a.root, c.a.qual)} + ${triName(c.b.root, c.b.qual)}`).join(", ")}.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn btn-ghost" onClick={() => previewAudio(
                        pcs.map((p) => (p - rootA + 12) % 12).sort((x, y) => x - y)
                          .map((rel) => 55 + ((rootA - 7 + 12) % 12) + rel), 0.14)}>
                ▶ Hear the six notes
              </button>
              {custom && (
                <button className="btn btn-primary" onClick={() => setPick({ kind: "custom" })}>
                  Practise this pair ↓
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="well mt-5 rounded-xl p-4">
            <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">not a pair</p>
            <p className="mt-1 text-[15px] text-cream/85">
              {triName(rootA, qualA)} and {triName(rootB, qualB)} share {shared.map((p) => PC_NAMES[p]).join(" and ")},
              so together they make only {new Set([...aPcs, ...bPcs]).size} notes, not six.
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-2">
          <div>
            <h3 className="text-[17px] font-bold">Two major triads: only three distances work</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-cream/80">
              A semitone, a whole step or a tritone apart. At any other distance they share a note.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sameMajor.map(({ iv, pcs: r }) => (
                <button key={iv} className="chip text-left hover:border-cream/40"
                        onClick={() => previewAudio(r.map((p) => 55 + ((p - 7 + 12) % 12)), 0.12)}>
                  <span className="block text-[15px] font-semibold">G + {PC_NAMES[(7 + iv) % 12]}</span>
                  <span className="block font-mono text-[13px] text-muted">
                    {iv === 1 ? "semitone" : iv === 2 ? "whole step" : "tritone"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[17px] font-bold">Two augmented triads: only two results</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-cream/80">
              A whole step apart they make the whole-tone scale; a semitone apart, the augmented scale.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([[3, 1], [3, 0]] as const).map(([a, b]) => {
                const r = augmentedPair(a, b);
                return (
                  <button key={`${a}${b}`} className="chip text-left hover:border-cream/40"
                          onClick={() => previewAudio(r.pcs.map((p) => 55 + ((p - 7 + 12) % 12)), 0.12)}>
                    <span className="block text-[15px] font-semibold">
                      G+ + {PC_NAMES[b === 1 ? 9 : 8]}+
                    </span>
                    <span className="block font-mono text-[13px] text-muted">{r.result === "whole-tone" ? "whole tone" : "augmented"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── pairs to practise ──────────────────────────────────────────── */}
      <section>
        <p className="eyebrow mb-3">Pairs to practise</p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PAIR_ATLAS.map((e) => {
            const on = pick.kind === "atlas" && pick.id === e.id;
            return (
              <button key={e.id} onClick={() => setPick({ kind: "atlas", id: e.id })} aria-pressed={on}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  on ? "border-cream/70 bg-white/[0.05]" : "border-line bg-surface hover:border-cream/30"}`}>
                <span className="block text-[17px] font-extrabold text-cream">{e.title}</span>
                <span className="mt-1 block text-[14px] text-cream/75">{e.subtitle}</span>
                <span className="mt-2 block font-mono text-[13px] text-muted">{e.formula}</span>
              </button>
            );
          })}
        </div>
      </section>

      {movement ? (
        <MovementLab
          key={pick.kind === "atlas" ? `${pick.id}` : "custom"}
          movement={movement}
          title={pick.kind === "custom" ? `${triName(rootA, qualA)} + ${triName(rootB, qualB)}` : `${entry!.title} · ${pretty(key)}`}
          description={pick.kind === "custom"
            ? "Your pair, alternating through every inversion."
            : entry!.description}
          controls={pick.kind === "atlas" ? (
            <div className="field">
              <label htmlFor="pa-key">Key</label>
              <select id="pa-key" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
                {KEYS.map((k) => <option key={k} value={k}>{pretty(k)}</option>)}
              </select>
            </div>
          ) : undefined}
        />
      ) : (
        <p className="card text-[15px] text-cream/80">
          These two triads make six notes, but their alternate notes do not form the two triads again,
          so there is no inversion ladder to play.
        </p>
      )}

      {/* ── the seven neighbours ───────────────────────────────────────── */}
      <section className="card">
        <p className="eyebrow">Inside the major scale</p>
        <h2 className="mt-2 text-2xl font-extrabold">Seven neighbours, seven six-note scales</h2>
        <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
          Neighbouring triads of {pretty(key)} major never share a note, so every neighbouring pair
          makes a six-note scale that leaves out one note.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {neighbours.map((n) => (
            <div key={n.pair} className="well rounded-lg p-3">
              <p className="text-[15px] font-bold">{pretty(n.chords[0])} + {pretty(n.chords[1])}</p>
              <p className="mt-1 font-mono text-[13px] text-muted">{n.pair} · no {pretty(n.omitted)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TriadPicker({ label, root, qual, setRoot, setQual }: {
  label: string; root: number; qual: TriadQuality;
  setRoot: (n: number) => void; setQual: (q: TriadQuality) => void;
}) {
  const id = label.replace(/\s/g, "-").toLowerCase();
  return (
    <div className="flex items-end gap-2">
      <div className="field">
        <label htmlFor={`${id}-root`}>{label}</label>
        <select id={`${id}-root`} className="sel !w-24" value={root} onChange={(e) => setRoot(Number(e.target.value))}>
          {PC_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-qual`} className="sr-only">{label} quality</label>
        <select id={`${id}-qual`} className="sel !w-36" value={qual} onChange={(e) => setQual(e.target.value as TriadQuality)}>
          {QUALS.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
        </select>
      </div>
    </div>
  );
}
