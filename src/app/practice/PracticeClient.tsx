"use client";

import { useEffect, useState } from "react";
import Notation from "@/components/Notation";
import Keyboard from "@/components/Keyboard";
import { ChordGrid, ResolutionBanner, ScaleChips, Seg, Toggle } from "@/components/Panels";
import { useDrill } from "@/lib/useDrill";
import { KEYS, FAMILIES, DIATONIC_MODES } from "@/lib/theory/scales";
import { PATTERNS } from "@/lib/theory/patterns";
import { SUBDIVISIONS } from "@/lib/theory/resolution";
import { midi, pc } from "@/lib/theory/note";

export default function PracticeClient() {
  const d = useDrill();
  const { state, set, scale, notes, resolution, gati, seconds, playing, index } = d;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); d.toggle(); }
      if (e.key === "l") set("loop", !state.loop);
      if (e.key === "c") set("click", !state.click);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d, set, state.loop, state.click]);

  const activeNote = index >= 0 && notes[index] ? notes[index] : null;
  const isRotation = scale.family.kind === "rotation";
  const usesTop = d.patternDef.usesTopNote;
  const usesCell = d.patternDef.usesCell;

  return (
    <div className="space-y-4">
      {/* ── scale selection ─────────────────────────────────────────────── */}
      <section className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="key">Key</label>
            <select id="key" className="sel" value={state.key} onChange={(e) => set("key", e.target.value)}>
              {KEYS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div className="field min-w-[260px] flex-1">
            <label htmlFor="fam">Scale family</label>
            <select id="fam" className="sel w-full" value={state.family}
                    onChange={(e) => { set("family", e.target.value); set("mode", 0); }}>
              {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div className="field min-w-[280px] flex-1">
            <label htmlFor="mode">Mode / rotation</label>
            <select id="mode" className="sel w-full" value={state.mode} disabled={!isRotation}
                    onChange={(e) => set("mode", Number(e.target.value))}>
              {isRotation
                ? DIATONIC_MODES.map((m) => (
                    <option key={m.index} value={m.index}>{m.name} · {m.degrees}</option>
                  ))
                : <option value={0}>—</option>}
            </select>
          </div>
          <div className="field">
            <label>Octaves</label>
            <Seg value={state.octaves} ariaLabel="Octaves"
                 options={[1, 2, 3].map((v) => ({ label: String(v), value: v }))}
                 onChange={(v) => set("octaves", v)} />
          </div>
          <div className="field" style={{ opacity: usesTop ? 1 : 0.35 }}>
            <label>Top note</label>
            <Toggle on={state.includeTop && usesTop}
                    onClick={() => usesTop && set("includeTop", !state.includeTop)}
                    title="Include the octave note. ON makes a hexatonic pattern 7 notes long — and 7 shares factors with nothing.">
              {usesTop ? `${state.includeTop ? "on" : "off"} · ${d.pattern.length} notes` : "n/a"}
            </Toggle>
          </div>
        </div>
      </section>

      {/* ── pattern + transport ─────────────────────────────────────────── */}
      <section className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field min-w-[300px] flex-1">
            <label htmlFor="pat">Pattern</label>
            <select id="pat" className="sel w-full" value={state.pattern}
                    onChange={(e) => set("pattern", e.target.value as any)}>
              {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ opacity: usesCell ? 1 : 0.35 }}>
            <label htmlFor="cell">Cell length</label>
            <select id="cell" className="sel" value={state.cell} disabled={!usesCell}
                    onChange={(e) => set("cell", Number(e.target.value))}>
              {[3, 4, 5, 6].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Subdivision</label>
            <Seg value={state.sub} ariaLabel="Subdivision"
                 options={SUBDIVISIONS.map((s) => ({ label: s.label, value: s.value }))}
                 onChange={(v) => set("sub", v)} />
          </div>
          <div className="field">
            <label>Accent grouping</label>
            <Seg value={state.grouping} ariaLabel="Accent grouping"
                 options={[3, 4, 5, 6, 7, 9].map((v) => ({ label: String(v), value: v }))}
                 onChange={(v) => set("grouping", v)} />
          </div>
          <div className="field">
            <label>Resolve</label>
            <Seg value={state.resolve} ariaLabel="Resolve mode"
                 options={[{ label: "accent", value: "accent" as const }, { label: "full", value: "full" as const }]}
                 onChange={(v) => set("resolve", v)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-line pt-4">
          <div className="field">
            <label htmlFor="bpm">Tempo <span className="text-gold">{state.bpm}</span></label>
            <input id="bpm" type="range" min={40} max={200} value={state.bpm}
                   onChange={(e) => set("bpm", Number(e.target.value))}
                   className="w-40 accent-[#C9A227]" />
          </div>
          <button className="btn btn-primary min-w-[120px] px-7 py-3 text-base tracking-wider"
                  onClick={d.toggle}
                  style={playing ? { background: "#8B1E24", color: "#F4EFE4" } : undefined}>
            {d.loadingAudio ? "LOADING…" : playing ? "STOP" : "PLAY"}
          </button>
          {d.countdown > 0 && (
            <span className="font-mono text-2xl font-bold tabular-nums text-gold">{d.countdown}</span>
          )}
          <Toggle on={state.loop} onClick={() => set("loop", !state.loop)}>Loop</Toggle>
          <Toggle on={state.click} onClick={() => set("click", !state.click)}>Click</Toggle>
          <button className="btn btn-ghost"
                  onClick={() => { navigator.clipboard?.writeText(d.shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
            {copied ? "Link copied" : "Copy drill link"}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            space = play/stop
          </span>
        </div>
        {d.audioError && <p className="mt-3 text-sm text-red">Audio: {d.audioError}</p>}
      </section>

      <ResolutionBanner resolution={resolution} gati={gati} seconds={seconds} bpm={state.bpm} />

      {state.includeTop && usesTop && (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-2.5 text-sm text-amber">
          Top note is on, so the pattern is {d.pattern.length} notes — and 7 shares factors
          with nothing. Turn it off to get the six-note advantage.
        </p>
      )}

      {/* ── the scale ───────────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-start gap-6">
        <ScaleChips scale={scale} transpose={state.transpose}
                    activePc={activeNote ? pc(activeNote) : null} />
        <div className="max-w-lg text-sm">
          <p className="font-semibold">{scale.label}</p>
          <p className="mt-0.5 text-muted">{scale.teaching}</p>
          {scale.aka.length > 0 && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              also called: {scale.aka.join(" · ")}
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] text-muted">
            {scale.forte} · vector &lt;{scale.intervalVector.join("")}&gt; ·{" "}
            {scale.tritones === 0 ? "no tritones" : `${scale.tritones} tritone${scale.tritones > 1 ? "s" : ""}`}
          </p>
        </div>
      </section>

      {!scale.error && notes.length > 0 && (
        <Notation notes={notes} subdivision={state.sub} grouping={state.grouping}
                  activeIndex={index} />
      )}

      <Keyboard scale={scale.notes} removed={scale.removed}
                activeMidi={activeNote ? midi(activeNote) : null}
                startMidi={60} octaves={2}
                onNote={(m) => { void import("@/lib/audio/engine").then(({ getAudio }) => getAudio().preview([m + 12])); }} />

      <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />sounding now</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-red align-middle" />the note we removed</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-cream align-middle" />scale notes</span>
        <span>&gt; = accent</span>
      </div>

      <section className="card">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Available harmony — tap to hear it, tap again to flip the reading
        </h2>
        <ChordGrid scale={scale} transpose={state.transpose} />
        <p className="mt-4 max-w-3xl text-sm text-muted">
          A chord here is a <span className="text-cream">pitch-class set carrying a list of names</span>,
          never one root plus one quality. <span className="text-cream">Am7</span> and{" "}
          <span className="text-cream">C6</span> are not two chords that happen to sound alike —
          they are one object seen from two angles.
        </p>
      </section>

      <p className="max-w-3xl text-sm text-muted">
        <span className="text-cream">{d.patternDef.label}.</span> {d.patternDef.hint}
      </p>
    </div>
  );
}
