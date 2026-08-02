"use client";

/**
 * Presenter mode. Built for a piano bench three metres from the screen and a
 * camera pointed at it — not for a student.
 *
 *  · huge type, no dialogs, no toasts, nothing that shifts layout mid-take
 *  · every action has a key, because you cannot hunt a mouse while playing
 *  · preset chips in teaching order, none of which is a 21-bar drill
 */

import { useEffect, useState } from "react";
import { useDrill, DrillState } from "@/lib/useDrill";
import { ResolutionBanner } from "@/components/Panels";
import Keyboard from "@/components/Keyboard";
import Notation from "@/components/Notation";
import { KEYS, DIATONIC_MODES } from "@/lib/theory/scales";
import { midi, notePretty, pc } from "@/lib/theory/note";
import { YATIS } from "@/lib/theory/resolution";

type Preset = { name: string; note: string; s: Partial<DrillState> };

const PRESETS: Preset[] = [
  { name: "Warm-up", note: "chatusra · 3 bars", s: { pattern: "aroha", sub: 4, grouping: 4, octaves: 1, includeTop: false, bpm: 84 } },
  { name: "Tisra", note: "3s in triplets · locks", s: { pattern: "aroha", sub: 3, grouping: 3, bpm: 84 } },
  { name: "Chatusra", note: "4s in triplets · locks", s: { pattern: "aroha", sub: 3, grouping: 4, bpm: 84 } },
  { name: "Khanda", note: "5s in triplets · 5 bars", s: { pattern: "aroha", sub: 3, grouping: 5, bpm: 84 } },
  { name: "Misra", note: "7s in triplets · 7 bars", s: { pattern: "aroha", sub: 3, grouping: 7, bpm: 84 } },
  { name: "In fourths", note: "every one perfect", s: { pattern: "fourths", sub: 4, grouping: 4, bpm: 76 } },
  { name: "In thirds", note: "hear the fourths appear", s: { pattern: "thirds", sub: 4, grouping: 4, bpm: 76 } },
  { name: "Cells of 4", note: "sequence practice", s: { pattern: "cells", cell: 4, sub: 4, grouping: 4, bpm: 84 } },
  { name: "Two octaves", note: "locks every bar", s: { pattern: "aroha", octaves: 2, sub: 3, grouping: 4, bpm: 84 } },
  { name: "Minor", note: "Pushpalathika", s: { mode: 4, pattern: "aroha", sub: 3, grouping: 4, bpm: 84 } },
];

export default function LiveClient() {
  const d = useDrill({ bpm: 84 });
  const { state, set, setState, scale, notes, resolution, gati, seconds, playing, index, toggle } = d;
  const [showNotation, setShowNotation] = useState(true);
  const [yatiStep, setYatiStep] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      const k = e.key;
      if (e.code === "Space") { e.preventDefault(); toggle(); return; }
      if (["3", "4", "5", "6", "7", "9"].includes(k)) { set("grouping", Number(k)); return; }
      if (k === "ArrowUp") { e.preventDefault(); set("key", KEYS[(KEYS.indexOf(state.key) + 1) % KEYS.length]); }
      if (k === "ArrowDown") { e.preventDefault(); set("key", KEYS[(KEYS.indexOf(state.key) + KEYS.length - 1) % KEYS.length]); }
      if (k === "ArrowRight") { e.preventDefault(); set("mode", (state.mode + 1) % 6); }
      if (k === "ArrowLeft") { e.preventDefault(); set("mode", (state.mode + 5) % 6); }
      if (k === "l") set("loop", !state.loop);
      if (k === "c") set("click", !state.click);
      if (k === "n") setShowNotation((v) => !v);
      if (k === "[") set("bpm", Math.max(40, state.bpm - 4));
      if (k === "]") set("bpm", Math.min(200, state.bpm + 4));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, state.bpm, state.click, state.key, state.loop, state.mode, toggle]);

  const activeNote = index >= 0 && notes[index] ? notes[index] : null;
  const bar = index >= 0 ? Math.floor(index / resolution.notesPerBar) + 1 : 0;
  const beat = index >= 0 ? Math.floor((index % resolution.notesPerBar) / state.sub) + 1 : 0;
  const landing = index >= 0 && index >= notes.length - state.sub;

  const yati = YATIS.find((y) => y.id === "srotovaha")!;

  return (
    <div className="space-y-5 pb-10">
      {/* presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.name}
                  onClick={() => setState((s) => ({ ...s, ...p.s }))}
                  className="well rounded-lg px-3.5 py-2 text-left transition hover:border-gold">
            <span className="block text-base font-bold">{p.name}</span>
            <span className="block font-mono text-xs text-muted">{p.note}</span>
          </button>
        ))}
        <button
          onClick={() => {
            const i = yatiStep === null ? 0 : (yatiStep + 1) % yati.shape.length;
            setYatiStep(i);
            setState((s) => ({ ...s, sub: 3, grouping: yati.shape[i], pattern: "aroha" }));
          }}
          className="rounded-lg border border-gold bg-gold/10 px-3.5 py-2 text-left transition hover:bg-gold/20">
          <span className="block text-base font-bold text-gold">Yati ladder →</span>
          <span className="block font-mono text-xs text-gold/80">
            srotovaha · {yati.shape.join(" ")}{yatiStep !== null ? ` · now ${yati.shape[yatiStep]}` : ""}
          </span>
        </button>
      </div>

      {/* the big readout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="card">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span className="text-6xl font-extrabold tracking-tight">{state.key}</span>
            <span className="text-2xl font-semibold text-muted">{scale.label}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {scale.notes.map((n, i) => {
              const lit = activeNote && pc(n) === pc(activeNote);
              return (
                <span key={i}
                      className={`rounded-lg border px-4 py-2 text-3xl font-bold tabular-nums transition ${
                        lit ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2"}`}>
                  {notePretty(n)}
                </span>
              );
            })}
            {scale.removed && (
              <span className="rounded-lg border-2 border-red px-4 py-2 text-3xl font-bold text-red line-through decoration-4">
                {notePretty(scale.removed)}
              </span>
            )}
          </div>
        </div>

        <div className={`card flex min-w-[260px] flex-col justify-center transition ${
          landing ? "hx-land border-gold bg-gold/15" : ""}`}>
          {d.countdown > 0 ? (
            <>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">count in</p>
              <p className="text-8xl font-extrabold tabular-nums text-gold">{d.countdown}</p>
            </>
          ) : playing ? (
            <>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">bar · beat</p>
              <p className="text-7xl font-extrabold tabular-nums">
                {bar}<span className="text-muted">.</span>{beat}
              </p>
              <p className={`mt-1 font-mono text-sm uppercase tracking-[0.12em] ${landing ? "text-gold" : "text-muted"}`}>
                {landing ? "landing on the one" : `of ${resolution.bars} bars`}
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">resolves in</p>
              <p className="text-8xl font-extrabold tabular-nums text-gold">{resolution.bars}</p>
              <p className="font-mono text-sm uppercase tracking-[0.12em] text-muted">bars</p>
            </>
          )}
        </div>
      </div>

      <ResolutionBanner resolution={resolution} gati={gati} seconds={seconds} bpm={state.bpm} big />

      {/* transport */}
      <div className="card flex flex-wrap items-center gap-4">
        <button onClick={d.toggle}
                className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[174px] px-10 py-4 text-xl tracking-wider`}>
          {d.loadingAudio ? "STARTING…" : playing ? "STOP" : "PLAY"}
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">tempo</span>
          <button className="btn btn-ghost px-3 py-2" onClick={() => set("bpm", Math.max(40, state.bpm - 4))}>−</button>
          <span className="w-14 text-center text-3xl font-extrabold tabular-nums text-gold">{state.bpm}</span>
          <button className="btn btn-ghost px-3 py-2" onClick={() => set("bpm", Math.min(200, state.bpm + 4))}>+</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">group</span>
          {[3, 4, 5, 6, 7, 9].map((g) => (
            <button key={g} onClick={() => set("grouping", g)}
                    aria-pressed={state.grouping === g}
                    className={`h-11 w-11 rounded-lg border text-lg font-bold transition ${
                      state.grouping === g ? "border-gold bg-gold text-[#17130a]" : "border-line bg-surface2 hover:border-gold"}`}>
              {g}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" data-on={state.loop} aria-pressed={state.loop}
                onClick={() => set("loop", !state.loop)}>Loop</button>
        <button className="btn btn-ghost" data-on={state.click} aria-pressed={state.click}
                onClick={() => set("click", !state.click)}>Click</button>
        <button className="btn btn-ghost" data-on={showNotation} aria-pressed={showNotation}
                onClick={() => setShowNotation((v) => !v)}>Score</button>
        <select className="sel" value={state.mode} onChange={(e) => set("mode", Number(e.target.value))}>
          {DIATONIC_MODES.map((m) => <option key={m.index} value={m.index}>{m.name}</option>)}
        </select>
      </div>

      {showNotation && !scale.error && notes.length > 0 && (
        <Notation notes={notes} subdivision={state.sub} grouping={state.grouping}
                  keySignature={scale.keySignature}
                  activeIndex={index} maxBars={8} />
      )}

      <Keyboard scale={scale.notes} removed={scale.removed}
                activeMidi={activeNote ? midi(activeNote) : null} octaves={2} height={150} />

      <p className="font-mono text-[12px] tracking-[0.02em] text-muted">
        space play/stop · 3–7 or 9 grouping · ↑↓ key · ←→ mode · [ ] tempo · l loop · c click · n score
      </p>
      <p className="min-h-5 text-sm text-muted" role="status" aria-live="polite">
        {d.loadingAudio ? "Starting the audio engine…"
          : d.audioReady ? "Audio ready. Piano samples continue caching in the background."
          : "Playback starts immediately while piano samples load in the background."}
      </p>
      {d.audioError && <p className="text-amber" role="alert">Audio: {d.audioError}</p>}
    </div>
  );
}
