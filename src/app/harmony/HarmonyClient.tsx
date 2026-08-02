"use client";

import { useMemo, useState } from "react";
import { buildScale, KEYS, DIATONIC_MODES } from "@/lib/theory/scales";
import { findChords, tertianOnly, susQuartal, triadPair, augmentedPair } from "@/lib/theory/chords";
import {
  SIXTH_DIMINISHED, buildSixthDim, harmonise, theFamily, notOctatonic, SixthFamily,
} from "@/lib/theory/barryharris";
import { midi, noteName, notePretty, pc, primeForm, forteName, intervalVector } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";
import { Seg } from "@/components/Panels";
import Keyboard from "@/components/Keyboard";

type Tab = "triads" | "pairs" | "barry";

export default function HarmonyClient() {
  const [tab, setTab] = useState<Tab>("triads");
  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-2xl pt-2">
        <h1 className="display mt-3 text-4xl">What you can build with it.</h1>
        <p className="lede mt-4">
          Three ways into the same question. What chords live inside the scale; which
          two triads generate it; and what happens when you stop thinking in scales
          altogether.
        </p>
      </header>

      <div className="seg w-fit">
        {([["triads", "Triads"], ["pairs", "Triad pairs"], ["barry", "Barry Harris"]] as const)
          .map(([id, label]) => (
            <button key={id} data-on={tab === id} onClick={() => setTab(id)}>{label}</button>
          ))}
      </div>

      {tab === "triads" && <Triads />}
      {tab === "pairs" && <Pairs />}
      {tab === "barry" && <Barry />}
    </div>
  );
}

/* ── 1. every chord in the scale ─────────────────────────────────────────── */
function Triads() {
  const [key, setKey] = useState("C");
  const [mode, setMode] = useState(0);
  const scale = buildScale(key, "diatonic", mode);
  const chords = useMemo(() => findChords(scale.notes, [3, 4]), [scale]);
  const tri = tertianOnly(chords.filter((c) => c.size === 3));
  const tet = tertianOnly(chords.filter((c) => c.size === 4));
  const sus = susQuartal(chords);

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="k">Key</label>
            <select id="k" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field min-w-[280px]">
            <label htmlFor="m">Mode</label>
            <select id="m" className="sel" value={mode} onChange={(e) => setMode(Number(e.target.value))}>
              {DIATONIC_MODES.map((x) => <option key={x.index} value={x.index}>{x.name} · {x.degrees}</option>)}
            </select>
          </div>
          <p className="font-mono text-lg text-gold">{scale.notes.map(notePretty).join(" ")}</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChordColumn title="Tertian triads" count={tri.length} chords={tri}
          note="Only four. There is no ii and no vii° — both needed the note we removed." />
        <ChordColumn title="Sixths & sevenths" count={tet.length} chords={tet}
          note="Three distinct sets. Two of them carry a second, equally correct name — tap to flip." />
        <ChordColumn title="Sus & quartal" count={sus.length} chords={sus}
          note="Stacked fourths rather than thirds. This scale is unusually rich in them." />
      </div>

      <section className="card">
        <p className="eyebrow">The whole scale, stacked</p>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
          Stack all six notes in thirds and nothing is left over — from the tonic you
          get a 13th chord without the 11th. Every note is a chord tone, which is why
          nothing you play over it sounds like a mistake.
        </p>
        <button className="btn btn-primary mt-4"
          onClick={() => previewAudio(scale.notes.map((n) => midi(n) + 12), 0.1)}>
          ▶ Hear all six as one chord
        </button>
      </section>
    </div>
  );
}

function ChordColumn({ title, count, chords, note }: any) {
  return (
    <section className="card">
      <h2 className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
        {title} <span className="text-gold">{count}</span>
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {chords.map((c: any, i: number) => (
          <button key={i} className="chip hover:border-gold/60"
            onClick={() => previewAudio(c.notes.map((n: any) => midi(n) + 12), 0.05)}>
            <span className="block text-sm font-semibold">
              {c.names.map((n: any) => n.symbol).join(" = ")}
            </span>
            <span className="block font-mono text-[12px] text-muted">{c.noteNames.join(" ")}</span>
          </button>
        ))}
      </div>
      <p className="quiet mt-4">{note}</p>
    </section>
  );
}

/* ── 2. triad pairs ──────────────────────────────────────────────────────── */
const QUALS = ["maj", "min", "aug", "dim"] as const;
const PC_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function Pairs() {
  const [rootA, setRootA] = useState(7);   // G
  const [qualA, setQualA] = useState<typeof QUALS[number]>("maj");
  const [rootB, setRootB] = useState(9);   // Am
  const [qualB, setQualB] = useState<typeof QUALS[number]>("min");

  const pcs = triadPair(rootA, qualA, rootB, qualB);
  const shape: Record<string, number[]> = { maj: [0,4,7], min: [0,3,7], aug: [0,4,8], dim: [0,3,6] };
  const aPcs = shape[qualA].map((i) => (rootA + i) % 12);
  const bPcs = shape[qualB].map((i) => (rootB + i) % 12);
  const shared = aPcs.filter((p) => bPcs.includes(p));

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="eyebrow">Two triads, six notes</p>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
          The jazz route into hexatonics — Weiskopf, Campbell and Bergonzi all teach it
          this way. Take two triads with no note in common and you have a six-note
          scale. The catch is that most pairs <em>do</em> share a note.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <TriadPicker label="First" root={rootA} qual={qualA} setRoot={setRootA} setQual={setQualA} />
          <span className="pb-2.5 text-2xl text-muted">+</span>
          <TriadPicker label="Second" root={rootB} qual={qualB} setRoot={setRootB} setQual={setQualB} />
        </div>
      </section>

      {pcs ? (
        <section className="card border-gold/35">
          <p className="eyebrow">Valid pair — six distinct notes</p>
          <p className="mt-3 font-mono text-3xl text-gold">
            {pcs.map((p) => PC_NAMES[p]).join("  ")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Fact label="set class" value={forteName(pcs).split("·")[0].trim() || "—"} />
            <Fact label="interval vector" value={`<${intervalVector(pcs).join("")}>`} />
            <Fact label="tritones" value={String(intervalVector(pcs)[5])}
                  tone={intervalVector(pcs)[5] === 0 ? "gold" : undefined} />
          </div>
          <button className="btn btn-primary mt-5"
            onClick={() => previewAudio(pcs.map((p) => 60 + p), 0.14)}>
            ▶ Hear it
          </button>
        </section>
      ) : (
        <section className="card border-red/35">
          <p className="eyebrow text-red-hi">Not a valid pair</p>
          <p className="mt-3 text-[15px] text-cream/80">
            These two share {shared.map((p) => PC_NAMES[p]).join(" and ")}, so together
            they make only {new Set([...aPcs, ...bPcs]).size} notes, not six.
          </p>
        </section>
      )}

      <section className="card">
        <p className="eyebrow">Two rules worth knowing</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Major triads only work at three distances</h3>
            <p className="quiet mt-2">
              Two major triads share no note only a semitone, a whole step or a tritone
              apart. Everything else overlaps — which is why{" "}
              <strong className="text-cream">C major + E♭ major is not a triad pair</strong>:
              they share G, giving five notes.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 6].map((iv) => {
                const r = triadPair(0, "maj", iv, "maj")!;
                return (
                  <button key={iv} className="chip text-left hover:border-gold/60"
                          onClick={() => previewAudio(r.map((p) => 60 + p), 0.12)}>
                    <span className="block text-sm font-semibold">C + {PC_NAMES[iv]}</span>
                    <span className="block font-mono text-[12px] text-muted">
                      {r.map((p) => PC_NAMES[p]).join(" ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">The augmented-triad parity rule</h3>
            <p className="quiet mt-2">
              There are only four augmented triads. Two of the same parity give the
              whole-tone scale; two of opposite parity give the augmented hexatonic.
              No other outcome is possible — that is a complete classification.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([[0, 2], [0, 1]] as const).map(([a, b]) => {
                const r = augmentedPair(a as any, b as any);
                return (
                  <button key={`${a}${b}`} className="chip text-left hover:border-gold/60"
                          onClick={() => previewAudio(r.pcs.map((p) => 60 + p), 0.12)}>
                    <span className="block text-sm font-semibold">
                      aug{a} + aug{b} → {r.result}
                    </span>
                    <span className="block font-mono text-[12px] text-muted">
                      {r.pcs.map((p) => PC_NAMES[p]).join(" ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="quiet mt-5">
          One more, verified by exhaustive search: <strong className="text-cream">G major
          + A minor is the only triad pair anywhere</strong> that produces C D E G A B.
        </p>
      </section>
    </div>
  );
}

function TriadPicker({ label, root, qual, setRoot, setQual }: any) {
  return (
    <div className="flex items-end gap-2">
      <div className="field">
        <label>{label}</label>
        <select className="sel !w-24" value={root} onChange={(e) => setRoot(Number(e.target.value))}>
          {PC_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
        </select>
      </div>
      <div className="field">
        <label>&nbsp;</label>
        <select className="sel !w-28" value={qual} onChange={(e) => setQual(e.target.value)}>
          {QUALS.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ── 3. Barry Harris ─────────────────────────────────────────────────────── */
function Barry() {
  const [key, setKey] = useState("C");
  const [fam, setFam] = useState<SixthFamily>("major6");
  const def = SIXTH_DIMINISHED.find((s) => s.id === fam)!;
  const scale = useMemo(() => buildSixthDim(key, fam), [key, fam]);
  const steps = useMemo(() => harmonise(key, fam), [key, fam]);
  const family = useMemo(() => theFamily(key, fam), [key, fam]);
  const proof = notOctatonic(fam);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="eyebrow">Not a scale system. A movement system.</p>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
          Barry Harris taught harmony as two chords alternating — a sixth chord and a
          diminished — rather than as II–V–I. Interlock them and every voice moves by
          one step, in the same direction, every time. He called it
          &ldquo;sixth&ndash;sixth&ndash;sixth&rdquo;.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="bk">Key</label>
            <select id="bk" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field min-w-[300px]">
            <label htmlFor="bf">Scale</label>
            <select id="bf" className="sel" value={fam} onChange={(e) => setFam(e.target.value as SixthFamily)}>
              {SIXTH_DIMINISHED.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary"
            onClick={() => previewAudio(scale.map((n) => midi(n) + 12), 0.13)}>
            ▶ Hear the scale
          </button>
        </div>
        <p className="mt-5 font-mono text-2xl text-gold">
          {scale.map(notePretty).join("  ")}
        </p>
        <p className="quiet mt-3 max-w-[68ch]">{def.teaching}</p>
      </section>

      <section className="card">
        <p className="eyebrow">The movement — harmonised in four parts</p>
        <p className="quiet mt-2">
          Alternate notes of the eight give the two chords, through every inversion.
          Tap along the row and listen to the voices step.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <button key={i}
              onClick={() => previewAudio(s.voicing.map((m) => m + 12), 0.02)}
              className={`rounded-xl border px-4 py-3 text-left transition hover:border-gold/60 ${
                s.isDiminished ? "border-line bg-surface2" : "border-gold/40 bg-gold/[0.07]"}`}>
              <span className={`block text-base font-bold ${s.isDiminished ? "text-cream/70" : "text-gold"}`}>
                {s.label}
              </span>
              <span className="block font-mono text-[12px] text-muted">
                {s.notes.map(noteName).join(" ")}
              </span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost mt-4"
          onClick={async () => {
            for (const [i, s] of steps.entries())
              setTimeout(() => previewAudio(s.voicing.map((m) => m + 12), 0.015), i * 480);
          }}>
          ▶ Run the whole movement
        </button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <p className="eyebrow">&ldquo;The family&rdquo;</p>
          <p className="quiet mt-2">
            One diminished seventh is the shared related diminished of four dominants.
            Lower any one of its notes by a semitone and that note becomes a root. They
            sit a minor third apart and substitute for each other.
          </p>
          <p className="mt-3 font-mono text-sm text-muted">
            {family.diminished.join(" ")} °7
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {family.dominants.map((d, i) => (
              <span key={i} className="chip text-sm font-semibold">{d.root}7</span>
            ))}
          </div>
        </section>

        <section className="card">
          <p className="eyebrow">These are not the octatonic</p>
          <p className="quiet mt-2">
            They are eight-note scales, but not the symmetric diminished — that one
            repeats every minor third and has only three transpositions.
          </p>
          <div className="mt-3 grid gap-2">
            <Fact label={`${def.name} — steps`} value={def.scale.map((v, i, a) =>
              ((a[i + 1] ?? 12) - v)).join(" ")} />
            <Fact label="its transpositions" value={String(proof.transpositions)}
                  tone={proof.transpositions !== 3 ? "gold" : undefined} />
            <Fact label="symmetric diminished" value={`${proof.symmetricSteps.join(" ")} · only ${proof.symmetricTranspositions}`} />
          </div>
          {proof.transpositions === 6 && (
            <p className="quiet mt-3">
              This one has six rather than twelve because it maps onto itself at the
              tritone — so C7♭5 and F♯7♭5 are the same scale. Tritone substitution is a
              property of the collection, not a trick applied to it.
            </p>
          )}
        </section>
      </div>

      <section className="card">
        <Keyboard scale={scale} removed={null} octaves={2} startMidi={60}
                  onNote={(m) => previewAudio([m + 12])} />
        <p className="quiet mt-4 max-w-[68ch]">
          Two things people get wrong and this page will not:{" "}
          <strong className="text-cream">the dominant scale uses A♭, not A</strong> (the
          natural-A version is the bebop dominant scale and cannot alternate), and{" "}
          <strong className="text-cream">&ldquo;sixth&rdquo; refers to the sixth chord</strong> —
          there is no six-note collection anywhere in Barry&rsquo;s system, which is
          precisely why it keeps being mis-filed under hexatonics.
        </p>
      </section>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "gold" }) {
  return (
    <div className="well rounded-lg px-3 py-2">
      <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-0.5 font-mono text-sm ${tone === "gold" ? "font-bold text-gold" : ""}`}>{value}</p>
    </div>
  );
}
