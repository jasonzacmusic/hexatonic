"use client";

/**
 * Improvise: six backing beds, one running band.
 *
 * Five beds are built only from the scale's own chords; the 12-bar blues
 * brings its own. One useLiveVamp drives all six, so switching bed, key,
 * scale, voicing or feel while it plays lands on the next bar and the music
 * never stops (the playback rule). The bar and beat, the chord sounding now,
 * the next chord and the notes to land on are always on screen.
 */

import { useEffect, useMemo, useState } from "react";
import Keyboard from "@/components/Keyboard";
import Fretboard from "@/components/Fretboard";
import BluesLane from "@/components/BluesLane";
import BeatCounter from "@/components/BeatCounter";
import { Seg, Toggle } from "@/components/Panels";
import { buildScale, KEYS, DIATONIC_MODES, FAMILIES } from "@/lib/theory/scales";
import {
  buildVamp, vampsFor, vampById, guideTones, nextChange, BedId, VoicingStyle, VampStep, VAMPS,
} from "@/lib/theory/vamps";
import { twelveBar } from "@/lib/theory/blues";
import { notePretty, pc } from "@/lib/theory/note";
import { previewAudio, VampPlan } from "@/lib/audio/engine";
import { useLiveVamp } from "@/lib/audio/useLive";

const VOICINGS: { label: string; value: VoicingStyle; hint: string }[] = [
  { label: "Shell", value: "shell", hint: "root, 3rd and 7th" },
  { label: "Rootless", value: "rootless", hint: "the bass plays the root; the chord leaves it out" },
  { label: "Spread", value: "spread", hint: "every chord note, wide" },
];

const pretty = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯")
  .replace("dim7", "°7").replace(/dim$/, "°").replace(/b5/, "♭5").replace(/quartal4?$/, " quartal");
const PROSE = "max-w-[68ch] text-[15px] leading-relaxed text-cream/80";
const FAMILY_MENU = FAMILIES.filter((f) => f.kind !== "custom");

export default function ImproviseClient() {
  const [bedId, setBedId] = useState<BedId>("two");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const bed = q.get("bed") ?? (q.get("lane") === "blues" ? "blues" : null);
    if (bed && VAMPS.some((v) => v.id === bed)) setBedId(bed as BedId);
  }, []);
  const [instrument, setInstrument] = useState<"keys" | "guitar">("keys");
  const [key, setKey] = useState("G");
  const [family, setFamily] = useState("diatonic");
  const [mode, setMode] = useState(0);
  const [voicing, setVoicing] = useState<VoicingStyle>("rootless");
  const [sixEight, setSixEight] = useState(false);
  const [bpm, setBpm] = useState(84);
  const [bass, setBass] = useState(true);
  const [comp, setComp] = useState(true);
  const [click, setClick] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [guides, setGuides] = useState(true);
  const [bluesScale, setBluesScale] = useState<"blues" | "blues-major">("blues");
  const [quickChange, setQuickChange] = useState(false);

  const isBlues = bedId === "blues";
  const scale = useMemo(
    () => (isBlues ? buildScale(key, bluesScale) : buildScale(key, family, mode)),
    [isBlues, key, family, mode, bluesScale],
  );
  /* Which beds the chosen scale can carry — judged on the scale menu's own
     scale, so picking the blues does not grey out the others. */
  const familyScale = useMemo(() => buildScale(key, family, mode), [key, family, mode]);
  const available = useMemo(() => (familyScale.error ? [] : vampsFor(familyScale)), [familyScale]);
  const bed = vampById(bedId);
  const steps: VampStep[] = useMemo(
    () => (scale.error || isBlues ? [] : buildVamp(scale, bed, voicing)),
    [scale, bed, voicing, isBlues],
  );
  const bars = useMemo(() => twelveBar(key, quickChange), [key, quickChange]);

  // A scale that cannot carry this bed falls back to the drone.
  useEffect(() => {
    if (available.length && !available.some((v) => v.id === bedId)) setBedId("drone");
  }, [available, bedId]);

  const feel: VampPlan["feel"] =
    isBlues || bed.feel === "swing" ? "swing" : sixEight ? "68" : "straight";
  const beatsPerBar = feel === "68" ? 6 : 4;

  /* One plan for every bed. The chords array is the identity the scheduler
     compares, so it only changes when the music does. */
  const chords = useMemo(
    () => isBlues
      ? bars.map((b) => ({ bass: b.bass, voicing: b.voicing, bars: 1 }))
      : steps.map((s) => ({ bass: s.chord.bass, voicing: s.chord.voicing, bars: s.bars })),
    [isBlues, bars, steps],
  );
  const labels = useMemo(
    () => (isBlues ? bars.map((b) => b.symbol) : steps.map((s) => s.chord.label)),
    [isBlues, bars, steps],
  );
  const plan = useMemo<VampPlan | null>(() => chords.length ? {
    chords, beatDur: 60 / bpm, beatsPerBar, feel, click, bassOn: bass, compOn: comp,
  } : null, [chords, bpm, beatsPerBar, feel, click, bass, comp]);
  const live = useLiveVamp(plan, () => ({ countInBeats: countIn ? beatsPerBar : 0 }));
  const { playing, stop, play, countdown, position } = live;

  // Light a chord only when the progression on screen is the one sounding.
  const onScreen = position && position.plan.chords === chords ? position : null;
  const chordIdx = onScreen ? onScreen.chordIndex : -1;
  const upcoming = onScreen
    ? nextChange(chords.map((c) => c.bars), onScreen.bar, onScreen.beat, onScreen.beats, labels)
    : null;
  const current = !isBlues && chordIdx >= 0 ? steps[chordIdx] : undefined;
  const currentBlues = isBlues && chordIdx >= 0 ? bars[chordIdx] : undefined;
  const tones = current && !scale.error ? guideTones(scale, current.chord) : null;
  const chordPcs = guides
    ? current ? current.chord.chordTones : currentBlues ? currentBlues.chordPcs : undefined
    : undefined;
  const bluesLand = currentBlues ? scale.notes.filter((n) => currentBlues.chordPcs.includes(pc(n))) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(t.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); playing ? stop() : play(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, stop]);

  const isRotation = scale.family.kind === "rotation";
  const nextLabel = upcoming ? pretty(labels[upcoming.index]) : null;

  return (
    <div className="space-y-5 pb-10">
      <header className="max-w-2xl pt-2">
        <h1 className="display mt-3 text-4xl sm:text-5xl">Improvise</h1>
        <p className="lede mt-4">
          Pick a backing bed and play. The notes to land on light up as the chords change.
        </p>
      </header>

      {/* ── the six beds ─────────────────────────────────────────────── */}
      <section aria-label="Backing bed" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {VAMPS.map((v) => {
          const ok = available.some((a) => a.id === v.id) || v.id === "blues";
          const on = v.id === bedId;
          return (
            <button key={v.id} disabled={!ok} aria-pressed={on} onClick={() => setBedId(v.id)}
              title={ok ? v.description : "This scale does not have the chords for this bed."}
              className={`rounded-xl border p-3 text-left transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-70 ${
                on ? "border-cream/80 bg-white/[0.06]" : "border-line bg-surface hover:border-cream/35"}`}>
              <span className="block text-[15px] font-bold text-cream">{v.name}</span>
              <span className="mt-1 block text-[13px] leading-snug text-cream/70">
                {ok ? v.description.split(".")[0] + "." : "Not in this scale."}
              </span>
            </button>
          );
        })}
      </section>

      {/* ── the stage ────────────────────────────────────────────────── */}
      <section className="card space-y-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="display text-3xl">{pretty(key)} {isBlues ? "blues" : scale.label}</h2>
          <span className="text-[15px] text-cream/75">{bed.name}{!isBlues && feel === "68" ? " · 6/8" : ""}</span>
        </div>

        {/* transport: always visible while you play */}
        <div className="sticky top-[64px] z-30 -mx-2 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-line bg-surface/95 px-3 py-3 backdrop-blur">
          <button onClick={() => (playing ? stop() : play())}
                  className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[112px] px-6 py-3 text-base tracking-wider`}>
            {playing ? "STOP" : "PLAY"}
          </button>
          <BeatCounter at={onScreen} beats={beatsPerBar}
                       bars={chords.reduce((n, c) => n + c.bars, 0)} countdown={countdown} />
          <span className="min-w-[10ch] text-[15px] text-cream/85" aria-live="polite">
            {countdown > 0 ? "" : upcoming
              ? <><span className="num text-[19px] text-cream">{upcoming.beats}</span> {upcoming.beats === 1 ? "beat" : "beats"} to <span className="font-bold">{nextLabel}</span></>
              : onScreen ? "one chord · stay on it" : ""}
          </span>
          <div className="field ml-auto">
            <label htmlFor="imp-t">Tempo <span className="text-cream">{bpm}</span></label>
            <input id="imp-t" type="range" min={40} max={180} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))} className="w-40 accent-[#C9A227]" />
          </div>
        </div>

        {isBlues ? (
          <BluesLane keyName={key} bars={bars} barIdx={chordIdx}
                     nextIdx={upcoming ? upcoming.index : -1}
                     scalePcs={scale.pcs} scaleChoice={bluesScale} setScaleChoice={setBluesScale}
                     quickChange={quickChange} setQuickChange={setQuickChange} />
        ) : (
          <>
            <p className={PROSE}>{bed.description}</p>
            <div className="flex flex-wrap gap-2.5">
              {steps.map((s, i) => {
                const on = i === chordIdx;
                const next = upcoming?.index === i && !on;
                return (
                  <button key={i}
                    onClick={() => previewAudio([s.chord.bass, ...s.chord.voicing], 0.04)}
                    className={`rounded-xl border px-5 py-3 text-left transition-colors duration-75 ${
                      on ? "border-gold bg-gold text-[#17130a]"
                         : next ? "border-dashed border-cream/75 bg-surface2"
                         : "border-line bg-surface2 hover:border-cream/35"}`}>
                    <span className="block text-2xl font-bold">{pretty(s.chord.label)}</span>
                    <span className={`block font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-muted"}`}>
                      {s.roman}{s.chord.altLabel ? ` · = ${pretty(s.chord.altLabel)}` : ""} · {s.bars} bar{s.bars > 1 ? "s" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {guides && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="well rounded-xl px-4 py-3">
              <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/80">land on these</p>
              <p className="mt-1 min-h-[1.75rem] font-mono text-xl text-gold">
                {(tones ? tones.chordTones : bluesLand).map(notePretty).join("  ") ||
                  <span className="text-[15px] text-cream/60">press play</span>}
              </p>
            </div>
            <div className="well rounded-xl px-4 py-3">
              <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/80">pass through these</p>
              <p className="mt-1 min-h-[1.75rem] font-mono text-xl text-cream/80">
                {(tones ? tones.colourTones
                  : currentBlues ? scale.notes.filter((n) => !currentBlues.chordPcs.includes(pc(n))) : [])
                  .map(notePretty).join("  ")}
              </p>
            </div>
          </div>
        )}
        {live.error && <p className="text-[15px] text-red-hi">{live.error}</p>}
      </section>

      {/* ── the instrument ───────────────────────────────────────────── */}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">
            {scale.notes.map(notePretty).join(" ")}
          </p>
          <Seg value={instrument} ariaLabel="Instrument"
               options={[{ label: "Keys", value: "keys" as const }, { label: "Guitar", value: "guitar" as const }]}
               onChange={setInstrument} />
        </div>
        {instrument === "keys" ? (
          <Keyboard scale={scale.notes} removed={isBlues ? null : scale.removed} octaves={3} startMidi={48}
                    chordTonePcs={chordPcs} height={148} onNote={(m) => previewAudio([m])} />
        ) : (
          <Fretboard scale={scale.notes} removed={isBlues ? null : scale.removed}
                     chordTonePcs={chordPcs} onNote={(m) => previewAudio([m])} />
        )}
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 font-mono text-[13px] uppercase tracking-[0.06em] text-cream/75">
          <span><i className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#F0E4B8] align-middle" />chord tone, sounding now</span>
          <span><i className="mr-2 inline-block h-3 w-3 rounded-sm bg-cream align-middle" />in the scale</span>
          {!isBlues && scale.removed && (
            <span><i className="mr-2 inline-block h-3 w-3 rounded-sm bg-red align-middle" />removed</span>
          )}
        </div>
      </section>

      {/* ── settings ─────────────────────────────────────────────────── */}
      <section className="card">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="eyebrow">The scale</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="k">Key</label>
                <select id="k" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
                  {KEYS.map((x) => <option key={x} value={x}>{pretty(x)}</option>)}
                </select>
              </div>
              {!isBlues && (
                <div className="field">
                  <label htmlFor="f">Family</label>
                  <select id="f" className="sel" value={family}
                          onChange={(e) => { setFamily(e.target.value); setMode(0); }}>
                    {FAMILY_MENU.map((x) => <option key={x.id} value={x.id}>{x.short}</option>)}
                  </select>
                </div>
              )}
            </div>
            {!isBlues && isRotation && (
              <div className="field">
                <label htmlFor="m">Mode</label>
                <select id="m" className="sel" value={mode} onChange={(e) => setMode(Number(e.target.value))}>
                  {DIATONIC_MODES.map((x) => (
                    <option key={x.index} value={x.index}>{x.name} · {x.degrees.replace(/b/g, "♭")}</option>))}
                </select>
              </div>
            )}
            {isBlues && (
              <p className={PROSE}>The blues bed plays over the {pretty(key)} blues scales; pick minor or major above.</p>
            )}
          </div>

          <div className="space-y-4 lg:border-l lg:border-line lg:pl-5">
            <p className="eyebrow">The band</p>
            {!isBlues && bedId !== "drone" && bedId !== "sus" && (
              <div className="field">
                <label>Voicing</label>
                <Seg value={voicing} ariaLabel="Voicing style"
                     options={VOICINGS.map((v) => ({ label: v.label, value: v.value }))}
                     onChange={setVoicing} />
                <p className="text-[14px] text-cream/75">{VOICINGS.find((v) => v.value === voicing)?.hint}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Toggle on={sixEight} disabled={isBlues || bed.feel === "swing"}
                      onClick={() => setSixEight((v) => !v)}
                      title={isBlues || bed.feel === "swing" ? "This bed has its own swing feel" : "A slow 6/8 lilt"}>
                6/8 feel
              </Toggle>
              <Toggle on={bass} onClick={() => setBass((v) => !v)}>Bass</Toggle>
              <Toggle on={comp} onClick={() => setComp((v) => !v)}>Chords</Toggle>
              <Toggle on={click} onClick={() => setClick((v) => !v)}>Click</Toggle>
              <Toggle on={countIn} onClick={() => setCountIn((v) => !v)}>Count-in</Toggle>
              <Toggle on={guides} onClick={() => setGuides((v) => !v)}>Guide tones</Toggle>
            </div>
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-muted">space · play / stop</p>
          </div>
        </div>
      </section>
    </div>
  );
}
