"use client";

import { useState } from "react";
import { FAMILIES, DIATONIC_MODES, KEYS, buildScale } from "@/lib/theory/scales";
import { findChords, tertianOnly } from "@/lib/theory/chords";
import { skipCycle } from "@/lib/theory/patterns";
import { midi, notePretty, noteName } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";
import Keyboard from "@/components/Keyboard";
import Link from "next/link";

export default function ScalesClient() {
  const [key, setKey] = useState("C");
  const [famId, setFamId] = useState("diatonic");
  const [mode, setMode] = useState(0);
  const fam = FAMILIES.find((f) => f.id === famId)!;
  const scale = buildScale(key, famId, mode);
  const isRot = fam.kind === "rotation";
  const chords = scale.error ? [] : tertianOnly(findChords(scale.notes, [3, 4]));

  const play = (gap = 0.2) =>
    previewAudio(scale.notes.map((n) => midi(n)), gap);

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-2xl pt-2">
        <h1 className="text-3xl font-extrabold">Scale library</h1>
        <p className="lede mt-3">
          Every family in every key, spelled the way it should be written — one letter per
          degree, no enharmonic shortcuts.
        </p>
      </header>

      <section className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="k">Key</label>
            <select id="k" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div className="field min-w-[280px] flex-1">
            <label htmlFor="f">Family</label>
            <select id="f" className="sel w-full" value={famId}
                    onChange={(e) => { setFamId(e.target.value); setMode(0); }}>
              {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          {isRot && (
            <div className="field min-w-[280px] flex-1">
              <label htmlFor="m">Mode</label>
              <select id="m" className="sel w-full" value={mode}
                      onChange={(e) => setMode(Number(e.target.value))}>
                {DIATONIC_MODES.map((m) => (
                  <option key={m.index} value={m.index}>{m.name} · {m.degrees}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => play()}>▶ Hear it</button>
        </div>
      </section>

      {scale.error ? (
        <p className="text-amber">{scale.error}</p>
      ) : (
        <>
          <section className="card">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-2xl font-extrabold">{key} {scale.label}</h2>
              <span className="font-mono text-2xl text-gold">
                {scale.notes.map(notePretty).join("  ")}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-muted">{scale.teaching}</p>
            {scale.aka.length > 0 && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                also called: {scale.aka.join(" · ")}
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="degrees" value={scale.degrees.join(" ")} />
              <Fact label="set class" value={scale.forte.split("·")[0].trim()} />
              <Fact label="interval vector" value={`<${scale.intervalVector.join("")}>`} />
              <Fact label="tritones" value={String(scale.tritones)}
                    tone={scale.tritones === 0 ? "gold" : undefined} />
            </div>
            <div className="mt-5"><Keyboard scale={scale.notes} removed={scale.removed}
                                            onNote={(m) => { void previewAudio([m]); }} /></div>
          </section>

          {chords.length > 0 && (
            <section className="card">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Tertian harmony inside it — {chords.length} distinct sets
              </h2>
              <div className="flex flex-wrap gap-2">
                {chords.map((c, i) => (
                  <button key={i} className="chip hover:border-gold"
                          onClick={() => { void previewAudio(c.notes.map((n) => midi(n)), 0.05); }}>
                    <span className="font-semibold">{c.names.map((n) => n.symbol).join(" = ")}</span>
                    <span className="block font-mono text-[10px] text-muted">{c.noteNames.join(" ")}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Interval cycles — what happens when you sequence it
            </h2>
            <div className="space-y-2">
              {[2, 3, 4, 5].map((step) => {
                const c = skipCycle(scale.notes, step);
                const label = ["", "", "in thirds", "in fourths", "in fifths", "in sixths"][step];
                return (
                  <div key={step} className="flex flex-wrap items-baseline gap-3">
                    <span className={`w-24 shrink-0 font-mono text-[11px] uppercase ${c.allPerfect ? "text-gold" : "text-muted"}`}>
                      {label}
                    </span>
                    <span className="font-mono text-sm">
                      {c.pairs.map((p) => `${noteName(p.from)}–${noteName(p.to)}`).join("  ")}
                    </span>
                    <span className={`font-mono text-[11px] ${c.allPerfect ? "font-bold text-gold" : "text-muted"}`}>
                      {Object.entries(c.tally).map(([k, v]) => `${v}× ${k}`).join(", ")}
                      {c.allPerfect ? " — all perfect" : ""}
                    </span>
                    <button className="btn btn-ghost ml-auto px-3 py-1 text-xs"
                            onClick={() => { void previewAudio(
                              c.pairs.flatMap((p) => [midi(p.from), midi(p.to)]), 0.17); }}>
                      ▶
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="card">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          The same family in every key
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KEYS.map((k) => {
            const s = buildScale(k, famId, mode);
            return (
              <button key={k} onClick={() => setKey(k)}
                      className={`flex items-baseline gap-3 rounded-lg border px-3 py-2 text-left transition ${
                        k === key ? "border-gold bg-surface2" : "border-line hover:border-gold"}`}>
                <span className="w-8 shrink-0 font-semibold">{k}</span>
                <span className="font-mono text-sm text-gold">
                  {s.error ? "—" : s.notes.map(notePretty).join(" ")}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">
          Diatonic spellings preserve distinct scale letters and avoid triple accidentals.
          Synthetic collections use the clearest conventional spelling, which can repeat
          a letter in collections such as the blues scale.
        </p>
      </section>

      {/* Saying what is missing, and why, is part of being accurate. */}
      <section className="card">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          What is deliberately not here
        </h2>
        <p className="mt-3 max-w-3xl">
          This app is twelve-tone equal temperament, which is an honest limit rather than
          an oversight. Some of the most famous scales in the world cannot be written
          inside it, and rounding them to the nearest key on a piano would teach you
          something false.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold">
              The quarter-tone maqamat
            </p>
            <p className="mt-1 text-sm text-muted">
              Rast, Bayati, Saba and Sikah all use notes that sit between the keys, and a
              maqam is a way of moving through them rather than a fixed set of pitches.
              What we do carry is <span className="text-cream">Hijaz</span>, which is
              genuinely playable here, and which is also the Freygish of klezmer and the
              Phrygian dominant of flamenco.
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold">
              Slendro and pelog
            </p>
            <p className="mt-1 text-sm text-muted">
              The Javanese and Balinese gamelan tunings are not twelve-tone, and pelog in
              particular is tuned differently from one gamelan to the next. There is no
              single correct set of piano keys for them, so we do not pretend there is.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          The Japanese pentatonics above <em>are</em> exactly representable, which is why
          they are here. Their naming is contested in the literature, so treat the labels
          as the common Western convention rather than a settled fact.
        </p>
      </section>

      <p>
        <Link href="/practice" className="btn btn-primary">Take this scale to the practice screen</Link>
      </p>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "gold" }) {
  return (
    <div className="rounded-lg border border-line bg-surface2 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-0.5 font-mono text-sm ${tone === "gold" ? "font-bold text-gold" : ""}`}>{value}</p>
    </div>
  );
}
