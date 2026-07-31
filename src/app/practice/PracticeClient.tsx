"use client";

import { useEffect, useState } from "react";
import Notation from "@/components/Notation";
import Keyboard from "@/components/Keyboard";
import ScaleRing from "@/components/ScaleRing";
import { ChordGrid, ResolutionBanner, ScaleChips, Seg, Toggle } from "@/components/Panels";
import { useDrill } from "@/lib/useDrill";
import { KEYS, FAMILIES, DIATONIC_MODES } from "@/lib/theory/scales";
import { PATTERNS } from "@/lib/theory/patterns";
import { SUBDIVISIONS } from "@/lib/theory/resolution";
import { METERS, saptaTalaMeters } from "@/lib/theory/meters";
import { midi, pc } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";
import CustomBuilder from "@/components/CustomBuilder";
import MidiPanel from "@/components/MidiPanel";

export default function PracticeClient() {
  const d = useDrill();
  const { state, set, scale, notes, resolution, gati, seconds, playing, index, toggle } = d;
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<"scale" | "pattern" | "rhythm">("scale");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.key === "l") set("loop", !state.loop);
      if (e.key === "c") set("click", !state.click);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, state.loop, state.click, toggle]);

  const activeNote = index >= 0 && notes[index] ? notes[index] : null;
  const activePc = activeNote ? pc(activeNote) : null;
  const isRotation = scale.family.kind === "rotation";
  const usesTop = d.patternDef.usesTopNote;
  const usesCell = d.patternDef.usesCell;
  const copyLink = () => {
    navigator.clipboard?.writeText(d.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-5">
      {/* ── the scale, the ring, and the transport ───────────────────── */}
      <section className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="card flex flex-col justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="display text-4xl">{state.key}</span>
                <span className="text-lg font-semibold text-cream/80">{scale.label}</span>
              </h1>
            </div>
            <p className="quiet mt-2 max-w-xl">{scale.teaching}</p>
          </div>

          <ScaleChips scale={scale} activePc={activePc} size="lg" />

          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span>{scale.forte}</span>
            <span>vector &lt;{scale.intervalVector.join("")}&gt;</span>
            <span className={scale.tritones === 0 ? "text-gold" : ""}>
              {scale.tritones === 0 ? "no tritones" : `${scale.tritones} tritone${scale.tritones > 1 ? "s" : ""}`}
            </span>
            {scale.aka.length > 0 && <span>also: {scale.aka[0]}</span>}
          </div>
        </div>

        <div className="card hidden items-center justify-center lg:flex lg:w-[340px]">
          <div className="relative">
            <ScaleRing notes={scale.notes} removed={scale.removed} activePc={activePc} size={290} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {d.countdown > 0 ? (
                <>
                  <span className="num text-5xl text-gold">{d.countdown}</span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                    count in
                  </span>
                </>
              ) : (
                <>
                  <span className="num text-4xl text-gold glow-gold">{resolution.bars}</span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                    bars
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── controls ────────────────────────────────────────────────── */}
      <section className="card">
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface2 p-1 lg:hidden"
             role="tablist" aria-label="Practice controls">
          {(["scale", "pattern", "rhythm"] as const).map((tab) => (
            <button key={tab} role="tab" aria-selected={mobileTab === tab}
                    onClick={() => setMobileTab(tab)}
                    className={`rounded-lg px-2 py-2.5 text-xs font-bold capitalize transition ${
                      mobileTab === tab ? "bg-gold text-[#17130a]" : "text-muted"}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4 lg:hidden">
          {mobileTab === "scale" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label htmlFor="mobile-key">Key</label>
                  <select id="mobile-key" className="sel" value={state.key}
                          onChange={(e) => set("key", e.target.value)}>
                    {KEYS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="mobile-family">Family</label>
                  <select id="mobile-family" className="sel" value={state.family}
                          onChange={(e) => { set("family", e.target.value); set("mode", 0); }}>
                    {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.short}</option>)}
                  </select>
                </div>
              </div>
              {state.family === "custom" ? (
                <div className="field">
                  <label>Your notes</label>
                  <CustomBuilder code={state.custom} scale={scale}
                                 onChange={(c) => set("custom", c)} />
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="mobile-mode">Mode / rotation</label>
                  <select id="mobile-mode" className="sel" value={state.mode} disabled={!isRotation}
                          onChange={(e) => set("mode", Number(e.target.value))}>
                    {isRotation
                      ? DIATONIC_MODES.map((m) => (
                          <option key={m.index} value={m.index}>{m.name} · {m.degrees}</option>))
                      : <option value={0}>—</option>}
                  </select>
                </div>
              )}
            </>
          )}

          {mobileTab === "pattern" && (
            <>
              <div className="field">
                <label htmlFor="mobile-pattern">Pattern</label>
                <select id="mobile-pattern" className="sel" value={state.pattern}
                        onChange={(e) => set("pattern", e.target.value as any)}>
                  {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="field">
                  <label>Octaves</label>
                  <Seg value={state.octaves} ariaLabel="Mobile octaves"
                       options={[1, 2, 3].map((v) => ({ label: String(v), value: v }))}
                       onChange={(v) => set("octaves", v)} />
                </div>
                <div className="field" style={{ opacity: usesTop ? 1 : 0.4 }}>
                  <label>Top note</label>
                  <Toggle on={state.includeTop && usesTop} disabled={!usesTop}
                          onClick={() => usesTop && set("includeTop", !state.includeTop)}>
                    {usesTop ? (state.includeTop ? "on" : "off") : "n/a"}
                  </Toggle>
                </div>
                <div className="field" style={{ opacity: usesCell ? 1 : 0.4 }}>
                  <label htmlFor="mobile-cell">Cell</label>
                  <select id="mobile-cell" className="sel !w-20" value={state.cell} disabled={!usesCell}
                          onChange={(e) => set("cell", Number(e.target.value))}>
                    {[3, 4, 5, 6].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {mobileTab === "rhythm" && (
            <>
              <div className="field min-w-[200px]">
                <label htmlFor="meter">Meter / tala</label>
                <select id="meter" className="sel" value={state.meter}
                        onChange={(e) => set("meter", e.target.value)}>
                  <optgroup label="Simple">
                    {METERS.filter((m) => m.family === "simple")
                      .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Compound">
                    {METERS.filter((m) => m.family === "compound")
                      .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Odd">
                    {METERS.filter((m) => m.family === "odd")
                      .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Sapta talas">
                    {saptaTalaMeters().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="field">
                <label>Subdivision</label>
                <Seg value={state.sub} ariaLabel="Mobile subdivision"
                     options={SUBDIVISIONS.map((s) => ({ label: s.label, value: s.value }))}
                     onChange={(v) => set("sub", v)} />
              </div>
              <div className="field">
                <label>Accent grouping</label>
                <Seg value={state.grouping} ariaLabel="Mobile accent grouping"
                     options={[3, 4, 5, 6, 7, 9].map((v) => ({ label: String(v), value: v }))}
                     onChange={(v) => set("grouping", v)} />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="field">
                  <label>Resolve</label>
                  <Seg value={state.resolve} ariaLabel="Mobile resolve mode"
                       options={[{ label: "accent", value: "accent" as const },
                                 { label: "full", value: "full" as const }]}
                       onChange={(v) => set("resolve", v)} />
                </div>
                <Toggle on={state.loop} onClick={() => set("loop", !state.loop)}>Loop</Toggle>
                <Toggle on={state.click} onClick={() => set("click", !state.click)}>Click</Toggle>
          <Toggle on={state.countIn} onClick={() => set("countIn", !state.countIn)}
                  title="Play a bar of clicks before the drill starts.">Count-off</Toggle>
              </div>
            </>
          )}
        </div>

        <div className="hidden gap-5 lg:grid lg:grid-cols-2">
          <div className="space-y-4">
            <p className="eyebrow">The scale</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="key">Key</label>
                <select id="key" className="sel" value={state.key}
                        onChange={(e) => set("key", e.target.value)}>
                  {KEYS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fam">Family</label>
                <select id="fam" className="sel" value={state.family}
                        onChange={(e) => { set("family", e.target.value); set("mode", 0); }}>
                  {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.short}</option>)}
                </select>
              </div>
            </div>
            {state.family === "custom" ? (
              <div className="field">
                <label>Your notes</label>
                <CustomBuilder code={state.custom} scale={scale}
                               onChange={(c) => set("custom", c)} />
              </div>
            ) : (
            <div className="field">
              <label htmlFor="mode">Mode / rotation</label>
              <select id="mode" className="sel" value={state.mode} disabled={!isRotation}
                      onChange={(e) => set("mode", Number(e.target.value))}>
                {isRotation
                  ? DIATONIC_MODES.map((m) => (
                      <option key={m.index} value={m.index}>{m.name} · {m.degrees}</option>))
                  : <option value={0}>—</option>}
              </select>
            </div>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <div className="field">
                <label>Octaves</label>
                <Seg value={state.octaves} ariaLabel="Octaves"
                     options={[1, 2, 3].map((v) => ({ label: String(v), value: v }))}
                     onChange={(v) => set("octaves", v)} />
              </div>
              <div className="field" style={{ opacity: usesTop ? 1 : 0.4 }}>
                <label>Top note</label>
                <Toggle on={state.includeTop && usesTop} disabled={!usesTop}
                        onClick={() => usesTop && set("includeTop", !state.includeTop)}
                        title="Including the octave makes a hexatonic pattern 7 notes long — and 7 shares factors with nothing.">
                  {usesTop ? `${state.includeTop ? "on" : "off"} · ${d.pattern.length} notes` : "n/a"}
                </Toggle>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:border-l lg:border-line lg:pl-5">
            <p className="eyebrow">The drill</p>
            <div className="field">
              <label htmlFor="pat">Pattern</label>
              <select id="pat" className="sel" value={state.pattern}
                      onChange={(e) => set("pattern", e.target.value as any)}>
                {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="field" style={{ opacity: usesCell ? 1 : 0.4 }}>
                <label htmlFor="cell">Cell</label>
                <select id="cell" className="sel !w-20" value={state.cell} disabled={!usesCell}
                        onChange={(e) => set("cell", Number(e.target.value))}>
                  {[3, 4, 5, 6].map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="field min-w-[200px]">
                <label htmlFor="meter">Meter / tala</label>
                <select id="meter" className="sel" value={state.meter}
                        onChange={(e) => set("meter", e.target.value)}>
                  <optgroup label="Simple">
                    {METERS.filter((m) => m.family === "simple")
                      .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Compound">
                    {METERS.filter((m) => m.family === "compound")
                      .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Odd">
                    {METERS.filter((m) => m.family === "odd")
                      .map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Sapta talas">
                    {saptaTalaMeters().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="field">
                <label>Subdivision</label>
                <Seg value={state.sub} ariaLabel="Subdivision"
                     options={SUBDIVISIONS.map((s) => ({ label: s.label, value: s.value }))}
                     onChange={(v) => set("sub", v)} />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="field">
                <label>Accent grouping</label>
                <Seg value={state.grouping} ariaLabel="Accent grouping"
                     options={[3, 4, 5, 6, 7, 9].map((v) => ({ label: String(v), value: v }))}
                     onChange={(v) => set("grouping", v)} />
              </div>
              <div className="field">
                <label>Resolve</label>
                <Seg value={state.resolve} ariaLabel="Resolve mode"
                     options={[{ label: "accent", value: "accent" as const },
                               { label: "full", value: "full" as const }]}
                     onChange={(v) => set("resolve", v)} />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <hr className="my-5 border-line" />
          <div className="flex flex-wrap items-center gap-4">
          <button className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[132px] px-8 py-3.5 text-base tracking-wider`}
                  onClick={d.toggle}>
            {d.loadingAudio ? "STARTING…" : playing ? "STOP" : "PLAY"}
          </button>
          <div className="field">
            <label htmlFor="bpm">Tempo <span className="text-gold">{state.bpm}</span></label>
            <input id="bpm" type="range" min={40} max={200} value={state.bpm}
                   onChange={(e) => set("bpm", Number(e.target.value))} className="w-44" />
          </div>
          <Toggle on={state.loop} onClick={() => set("loop", !state.loop)}>Loop</Toggle>
          <Toggle on={state.click} onClick={() => set("click", !state.click)}>Click</Toggle>
          <Toggle on={state.countIn} onClick={() => set("countIn", !state.countIn)}
                  title="Play a bar of clicks before the drill starts.">Count-off</Toggle>
          <button className="btn btn-ghost"
                  onClick={copyLink}>
            {copied ? "✓ Link copied" : "Copy drill link"}
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            Print / PDF
          </button>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            space play · l loop · c click
          </span>
          </div>
        </div>
        <p className="mt-3 min-h-5 text-sm text-muted" role="status" aria-live="polite">
          {d.loadingAudio ? "Starting the audio engine…"
            : d.audioReady ? "Audio ready. Piano samples continue caching in the background."
            : "Playback starts immediately while piano samples load in the background."}
        </p>
        {d.audioError && <p className="mt-1 text-sm text-amber" role="alert">Audio: {d.audioError}</p>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[116px] flex-1 py-3 text-base tracking-wider`}
                  onClick={toggle}>
            {d.loadingAudio ? "STARTING…" : playing ? "STOP" : "PLAY"}
          </button>
          <button className="btn btn-ghost px-3 py-3" aria-label="Decrease tempo"
                  onClick={() => set("bpm", Math.max(40, state.bpm - 4))}>−</button>
          <span className="w-12 text-center text-xl font-extrabold tabular-nums text-gold"
                aria-label={`${state.bpm} beats per minute`}>{state.bpm}</span>
          <button className="btn btn-ghost px-3 py-3" aria-label="Increase tempo"
                  onClick={() => set("bpm", Math.min(200, state.bpm + 4))}>+</button>
          <button className="btn btn-ghost px-3 py-3" onClick={copyLink}
                  aria-label={copied ? "Link copied" : "Copy drill link"}>
            {copied ? "✓" : "Link"}
          </button>
        </div>
      </div>

      <ResolutionBanner resolution={resolution} gati={gati} seconds={seconds}
                        bpm={state.bpm} playing={playing} />

      {d.meter.note && (
        <p className="quiet -mt-1 px-1">
          <span className="font-semibold text-cream">{d.meter.label}</span> — {d.meter.note}
        </p>
      )}

      {state.includeTop && usesTop && (
        <p className="rounded-xl border border-amber/40 bg-amber/[0.08] px-5 py-3 text-sm text-amber">
          Top note is on, so the pattern is {d.pattern.length} notes — and seven shares
          factors with nothing. Turn it off to get the six-note advantage back.
        </p>
      )}

      {!scale.error && notes.length > 0 && (
        <Notation notes={notes} subdivision={state.sub} grouping={state.grouping}
                  meterId={state.meter} beatsPerBar={d.meter.top}
                  keySignature={scale.keySignature}
                  activeIndex={index} />
      )}

      <section className="card">
        <Keyboard scale={scale.notes} removed={scale.removed}
                  activeMidi={activeNote ? midi(activeNote) : null} octaves={2}
                  onNote={(m) => { void previewAudio([m]); }} />
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />sounding now</span>
          <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-red align-middle" />the note we removed</span>
          <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-cream align-middle" />scale notes</span>
          <span>&gt; = accent</span>
        </div>
      </section>

      <MidiPanel expected={notes} grouping={state.grouping}
                 stepDur={d.stepDur} playing={playing} />

      <section className="card">
        <h2 className="eyebrow">Available harmony</h2>
        <p className="quiet mb-5 mt-2">
          Tap to hear it. Where a chord has two correct names, tap again to flip the reading.
        </p>
        <ChordGrid scale={scale} />
      </section>

      <p className="quiet max-w-3xl">
        <span className="font-semibold text-cream">{d.patternDef.label}.</span>{" "}
        {d.patternDef.hint}
      </p>
    </div>
  );
}
