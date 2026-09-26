"use client";

/**
 * Improvise: a backing band that plays only your scale's chords.
 *
 * Every loop but the 12-bar blues is built from the chosen scale's own notes
 * (src/lib/theory/vamps.ts); the blues steps outside on purpose and says so.
 * One useLiveVamp drives every loop, so changing the scale, key, loop, tempo,
 * feel or the example melody while it plays lands on the next beat or bar and
 * the music never stops (the playback rule). The chord sounding now, what it
 * does, the next chord, the bar and beat, and the notes to land on are always
 * on screen, next to the keyboard.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "@/components/Keyboard";
import Fretboard from "@/components/Fretboard";
import BluesLane from "@/components/BluesLane";
import BeatCounter from "@/components/BeatCounter";
import { Seg, Toggle } from "@/components/Panels";
import { buildScale, KEYS, FAMILY_GROUPS, familiesIn } from "@/lib/theory/scales";
import {
  buildVamp, vampsFor, vampById, guideTones, nextChange, whyNot, bassWalk, examplePhrase, tryThis,
  BedId, VampStep, VAMPS, Feel,
} from "@/lib/theory/vamps";
import { twelveBar, bluesTip } from "@/lib/theory/blues";
import { notePretty } from "@/lib/theory/note";
import { previewAudio, VampPlan } from "@/lib/audio/engine";
import { useLiveVamp } from "@/lib/audio/useLive";

const pretty = (s: string) => s
  .replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯").replace(/b5$/, "♭5")
  .replace(/dim7$/, "°7").replace(/dim$/, "°").replace(/quartal$/, " quartal").replace(/aug$/, "+");

/** The scale menu: every family but Custom, the diatonic modes listed one by one. */
const SCALE_MENU = FAMILY_GROUPS.filter((g) => g.id !== "custom").map((g) => ({
  label: g.label,
  options: familiesIn(g.id).flatMap((f) => f.kind === "rotation"
    ? f.modes!.map((m) => ({ value: `${f.id}:${m.index}`, label: m.name }))
    : [{ value: `${f.id}:0`, label: f.short }]),
})).filter((g) => g.options.length);

const LOOP_SHORT: Record<BedId, string> = {
  drone: "Drone", two: "Two chords", four: "Four chords", sus: "Open pad", swing: "Swing", blues: "12-bar blues",
};

const barsOf = (steps: VampStep[]) => steps.flatMap((s) => Array.from({ length: s.bars }, () => s.chord.chordTones));

export default function ImproviseClient() {
  const [bedId, setBedId] = useState<BedId>("two");
  const [scaleId, setScaleId] = useState("diatonic:0");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const bed = q.get("bed") ?? (q.get("lane") === "blues" ? "blues" : null);
    if (bed && VAMPS.some((v) => v.id === bed)) setBedId(bed as BedId);
    const sc = q.get("scale");
    if (sc && SCALE_MENU.some((g) => g.options.some((o) => o.value === sc))) setScaleId(sc);
  }, []);
  const [instrument, setInstrument] = useState<"keys" | "guitar">("keys");
  const [key, setKey] = useState("G");
  const [sixEight, setSixEight] = useState(false);
  const [bpm, setBpm] = useState(84);
  const [bass, setBass] = useState(true);
  const [comp, setComp] = useState(true);
  const [click, setClick] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [example, setExample] = useState(false);
  const [bluesScale, setBluesScale] = useState<"blues" | "blues-major">("blues");
  const [quickChange, setQuickChange] = useState(false);

  const [famId, modeStr] = scaleId.split(":");
  const menuScale = useMemo(() => buildScale(key, famId, Number(modeStr) || 0), [key, famId, modeStr]);
  const isBlues = bedId === "blues";
  const scale = useMemo(() => (isBlues ? buildScale(key, bluesScale) : menuScale), [isBlues, key, bluesScale, menuScale]);

  /* What each loop is on this scale, or why it is not offered. */
  const loops = useMemo(() => VAMPS.map((v) => {
    const steps = v.id === "blues" ? [] : buildVamp(menuScale, v);
    const ok = v.id === "blues" || steps.length > 0;
    const summary = v.id === "blues" ? "I7 · IV7 · V7"
      : v.id === "drone" ? steps[0]?.chord.voicing.length === 3 ? "home + 5th" : "home note"
      : v.id === "sus" ? steps.map((s) => pretty(s.chord.label)).join(" – ")
      : steps.map((s) => s.numeral).join(" – ");
    return { v, ok, summary, why: ok ? null : whyNot(menuScale, v.id) };
  }), [menuScale]);
  const available = useMemo(() => vampsFor(menuScale).map((v) => v.id), [menuScale]);
  // A scale that cannot carry this loop falls back to the drone (the music carries on).
  useEffect(() => {
    if (!available.includes(bedId)) setBedId("drone");
  }, [available, bedId]);

  const bed = vampById(bedId);
  const steps = useMemo(() => (isBlues || scale.error ? [] : buildVamp(scale, bed)), [scale, bed, isBlues]);
  const bars = useMemo(() => twelveBar(key, quickChange), [key, quickChange]);

  const feel: Feel = isBlues || bed.feel === "swing" ? "swing" : sixEight ? "68" : "straight";
  const beatsPerBar = feel === "68" ? 6 : 4;

  /* One plan for every loop. The chords array is the identity the page
     compares with the sounding plan, so it only changes when the music does. */
  const chords = useMemo(() => {
    if (isBlues) return bars.map((b) => ({ bass: b.bass, voicing: b.voicing, bars: 1, walk: [b.walk] }));
    const walk = bassWalk(scale.pcs,
      steps.map((s) => ({ bass: s.chord.bass, chordTones: s.chord.chordTones, bars: s.bars,
                          pedal: s.chord.label.includes("/") })), feel);
    return steps.map((s, i) => ({ bass: s.chord.bass, voicing: s.chord.voicing, bars: s.bars, walk: walk[i] }));
  }, [isBlues, bars, steps, scale.pcs, feel]);
  const labels = useMemo(() => (isBlues ? bars.map((b) => b.symbol) : steps.map((s) => s.chord.label)), [isBlues, bars, steps]);
  const barTones = useMemo(() => (isBlues ? bars.map((b) => b.chordPcs) : barsOf(steps)), [isBlues, bars, steps]);
  const phrase = useMemo(() => examplePhrase(scale.pcs, barTones, feel, beatsPerBar), [scale.pcs, barTones, feel, beatsPerBar]);

  const plan = useMemo<VampPlan | null>(() => chords.length ? {
    chords, beatDur: 60 / bpm, beatsPerBar, feel, click, bassOn: bass, compOn: comp,
    lead: example ? phrase : undefined,
  } : null, [chords, bpm, beatsPerBar, feel, click, bass, comp, example, phrase]);
  const live = useLiveVamp(plan, () => ({ countInBeats: countIn ? beatsPerBar : 0 }));
  const { playing, stop, play, countdown, position } = live;

  // Light a chord only when the progression on screen is the one sounding.
  const onScreen = position && position.plan.chords === chords ? position : null;
  const chordIdx = onScreen ? onScreen.chordIndex : -1;
  const upcoming = onScreen
    ? nextChange(chords.map((c) => c.bars), onScreen.bar, onScreen.beat, onScreen.beats, labels)
    : null;

  /* The chord to show big: the one sounding, or the loop's first before Play. */
  const shownIdx = chordIdx >= 0 ? chordIdx : 0;
  const step = !isBlues ? steps[shownIdx] : undefined;
  const bar = isBlues ? bars[shownIdx] : undefined;
  const big = step
    ? { label: step.chord.label, numeral: step.numeral, fn: step.fnLabel, alt: step.chord.altLabel, tones: step.chord.chordTones }
    : bar ? { label: bar.symbol, numeral: bar.roman, fn: bar.fnLabel, alt: undefined, tones: bar.chordPcs } : null;
  const sounding = chordIdx >= 0;
  const tones = big && !scale.error ? guideTones(scale, { chordTones: big.tones }) : null;

  /* The example note sounding now, from the bar and beat on the audio clock. */
  const exampleMidi = useMemo(() => {
    if (!example || !onScreen || !position?.plan.lead) return null;
    const at = (onScreen.bar - 1) * onScreen.beats + (onScreen.beat - 1);
    const n = [...phrase].reverse().find((x) => x.at < at + 1 - 1e-6 && x.at + x.dur > at + 1e-6);
    return n ? n.midi : null;
  }, [example, onScreen, position, phrase]);

  const hint = isBlues ? bluesTip(key, scale.pcs) : tryThis(scale, bedId, steps);
  const nextLabel = upcoming ? pretty(labels[upcoming.index]) : null;
  const unavailable = loops.filter((l) => !l.ok);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(t.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); playing ? stop() : play(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, stop]);

  /* The keyboard fits its column: three octaves where there is room, two on a phone. */
  const kbRef = useRef<HTMLDivElement>(null);
  const [kbWidth, setKbWidth] = useState(0);
  useEffect(() => {
    const el = kbRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setKbWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [instrument]);
  const octaves = kbWidth && kbWidth < 560 ? 2 : 3;
  const keyWidth = kbWidth ? Math.max(20, Math.min(48, Math.floor(kbWidth / (octaves * 7)))) : 36;

  const hearExample = () => {
    setExample((v) => !v);
    if (!playing) void play();
  };

  const scaleName = isBlues
    ? `${pretty(key)} ${bluesScale === "blues" ? "minor blues" : "major blues"}`
    : `${pretty(scale.tonic)} ${menuScale.family.kind === "rotation" ? menuScale.family.modes![menuScale.modeIndex].name : menuScale.family.short}`;

  return (
    <div className="space-y-4 pb-10">
      {/* ── what this is ─────────────────────────────────────────────── */}
      <header className="pt-1">
        <h1 className="display text-4xl sm:text-5xl">Improvise</h1>
        <p className="lede mt-3">
          A backing band plays chords made only from your scale. Play any of its notes over it:
          the notes that belong to the chord sounding now are lit, so you know where to land.
        </p>
        <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[15px] text-cream/85">
          {["Pick a scale and a key.", "Pick a backing loop.",
            "Press Play and play along. Land on a lit note at the start of each bar."].map((t, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="num text-[17px] text-cream">{i + 1}</span>{t}
            </li>
          ))}
        </ol>
      </header>

      {/* ── 1 & 2: scale, key and loop ───────────────────────────────── */}
      <section className="card card-tight space-y-3" aria-label="Scale and loop">
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 sm:grid-cols-[minmax(0,320px)_100px_minmax(0,1fr)] sm:items-end">
          <div className="field">
            <label htmlFor="imp-scale">{isBlues ? "Scale · the blues picks its own" : "Scale"}</label>
            <select id="imp-scale" className="sel" value={scaleId} disabled={isBlues}
                    onChange={(e) => setScaleId(e.target.value)}>
              {SCALE_MENU.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-key">Key</label>
            <select id="imp-key" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((x) => <option key={x} value={x}>{pretty(x)}</option>)}
            </select>
          </div>
          <p className="col-span-2 font-mono text-[15px] tracking-[0.02em] text-cream/85 sm:col-span-1 sm:pb-2.5">
            {scale.notes.map(notePretty).join("  ")}
            {!isBlues && scale.removed && (
              <span className="ml-3 text-red">no {notePretty(scale.removed)}</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Backing loop">
          {loops.map(({ v, ok, summary }) => {
            const on = v.id === bedId;
            return (
              <button key={v.id} disabled={!ok} aria-pressed={on} onClick={() => setBedId(v.id)}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors duration-100 disabled:cursor-not-allowed ${
                  on ? "border-cream/80 bg-white/[0.07]" : ok ? "border-line bg-surface2 hover:border-cream/35" : "border-line/60 bg-transparent"}`}>
                <span className={`block text-[15px] font-bold ${ok ? "text-cream" : "text-cream/50"}`}>{LOOP_SHORT[v.id]}</span>
                <span className={`mt-0.5 block truncate font-mono text-[13px] ${ok ? "text-cream/70" : "text-cream/45"}`}>
                  {ok ? summary : "not in this scale"}
                </span>
              </button>
            );
          })}
        </div>
        {unavailable.length > 0 && (
          <ul className="space-y-1 text-[14px] leading-snug text-cream/70">
            {unavailable.map((l) => (
              <li key={l.v.id}><span className="font-semibold text-cream/85">{LOOP_SHORT[l.v.id]}:</span> {l.why}</li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 3: the stage — transport, the chord now, the keyboard ─────── */}
      <section className="card card-tight" aria-label="Play along">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button onClick={() => (playing ? stop() : play())}
                  className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[104px] px-5 py-3 text-base tracking-wider`}>
            {playing ? "STOP" : "PLAY"}
          </button>
          <button onClick={hearExample} aria-pressed={example}
                  className={`btn border px-4 py-3 ${example ? "border-cream/70 bg-cream/[0.08] text-cream" : "border-line bg-surface2 text-cream/85"}`}>
            {example ? "Stop the example" : "Hear an example"}
          </button>
          <BeatCounter at={onScreen} beats={beatsPerBar}
                       bars={chords.reduce((n, c) => n + c.bars, 0)} countdown={countdown} />
          <div className="field ml-auto min-w-[180px]">
            <label htmlFor="imp-t">Tempo <span className="text-cream">{bpm}</span></label>
            <input id="imp-t" type="range" min={40} max={180} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-[#C9A227]" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* the chord now */}
          <div className="well flex flex-col gap-2 rounded-xl p-4" aria-live="polite">
            <p className="micro-caps">{sounding ? "playing now" : "first chord"} · {scaleName}</p>
            <div className="flex items-baseline gap-3">
              <span className={`display text-5xl lg:text-6xl ${sounding ? "text-gold" : "text-cream"}`}>
                {big ? pretty(big.label) : "–"}
              </span>
              {big?.alt && <span className="font-mono text-[14px] text-cream/60">= {pretty(big.alt)}</span>}
            </div>
            {big && (
              <p className="font-mono text-[15px] text-cream/85">
                <span className="text-[19px] font-semibold text-cream">{big.numeral}</span>
                <span className="mx-2 text-cream/40">·</span>{big.fn}
              </p>
            )}
            <p className="min-h-[1.5rem] text-[15px] text-cream/85">
              {countdown > 0 ? "counting in…"
                : upcoming ? <><span className="num text-[19px] text-cream">{upcoming.beats}</span> {upcoming.beats === 1 ? "beat" : "beats"} to <span className="font-bold">{nextLabel}</span></>
                : onScreen ? "one chord: stay with it"
                : "press Play"}
            </p>
            {tones && (
              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-line pt-3">
                <div>
                  <p className="micro-caps">land on</p>
                  <p className="mt-0.5 font-mono text-[19px] text-cream">{tones.chordTones.map(notePretty).join(" ") || "–"}</p>
                </div>
                <div>
                  <p className="micro-caps">pass through</p>
                  <p className="mt-0.5 font-mono text-[19px] text-cream/70">{tones.colourTones.map(notePretty).join(" ") || "–"}</p>
                </div>
              </div>
            )}
          </div>

          {/* the progression and the keyboard */}
          <div className="min-w-0 space-y-3">
            {isBlues ? (
              <BluesLane bars={bars} barIdx={chordIdx} nextIdx={upcoming ? upcoming.index : -1}
                         scalePcs={scale.pcs} scaleChoice={bluesScale} setScaleChoice={setBluesScale}
                         quickChange={quickChange} setQuickChange={setQuickChange} />
            ) : (
              <div className="flex flex-wrap gap-2" role="list" aria-label="The loop">
                {steps.map((s, i) => {
                  const on = i === chordIdx;
                  const next = upcoming?.index === i && !on;
                  return (
                    <button key={i} role="listitem"
                      onClick={() => previewAudio([s.chord.bass, ...s.chord.voicing], 0.04)}
                      className={`rounded-lg border px-3.5 py-2 text-left transition-colors duration-75 ${
                        on ? "border-gold bg-gold text-[#17130a]"
                           : next ? "border-dashed border-cream/75 bg-surface2"
                           : "border-line bg-surface2 hover:border-cream/35"}`}>
                      <span className="block text-[19px] font-bold leading-tight">{pretty(s.chord.label)}</span>
                      <span className={`block font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-cream/70"}`}>
                        {s.numeral} · {s.bars} bar{s.bars > 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div ref={kbRef} className="min-w-0">
              {instrument === "keys" ? (
                <Keyboard scale={scale.notes} removed={isBlues ? null : scale.removed}
                          octaves={octaves} startMidi={octaves === 2 ? 60 : 48} keyWidth={keyWidth}
                          height={Math.round(Math.min(keyWidth, 44) * 3.4)}
                          chordTonePcs={big?.tones} activeMidi={exampleMidi}
                          onNote={(m) => previewAudio([m])} />
              ) : (
                <Fretboard scale={scale.notes} removed={isBlues ? null : scale.removed}
                           chordTonePcs={big?.tones} activePc={exampleMidi === null ? null : exampleMidi % 12}
                           onNote={(m) => previewAudio([m])} />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[13px] text-cream/75">
                <span><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-[#F0E4B8] align-middle" />in the chord now</span>
                <span><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-cream/60 align-middle" />in the scale</span>
                {example && <span><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-gold align-middle" />the example, sounding</span>}
                {!isBlues && scale.removed && (
                  <span><i className="mr-1.5 inline-block h-3 w-3 rounded-sm border-2 border-red align-middle" />removed</span>
                )}
              </div>
              <Seg value={instrument} ariaLabel="Instrument"
                   options={[{ label: "Keys", value: "keys" as const }, { label: "Guitar", value: "guitar" as const }]}
                   onChange={setInstrument} />
            </div>
          </div>
        </div>

        {hint && (
          <div className="mt-4 border-t border-line pt-3 font-serif text-[21px] italic leading-snug text-cream/90">
            <span className="mr-2 not-italic font-mono text-[13px] uppercase tracking-[0.08em] text-muted">try this</span>{hint}
          </div>
        )}
        {example && (
          <p className="mt-2 text-[15px] text-cream/75">
            The example starts every bar on a lit note, then steps through the scale to the next one. Copy it, then change it.
          </p>
        )}
        {live.error && <p className="mt-2 text-[15px] text-red-hi">{live.error}</p>}
      </section>

      {/* ── the band ─────────────────────────────────────────────────── */}
      <section className="card card-tight" aria-label="The band">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow mr-2">The band</p>
          <Toggle on={feel === "68"} disabled={isBlues || bed.feel === "swing"}
                  onClick={() => setSixEight((v) => !v)}
                  title={isBlues || bed.feel === "swing" ? "This loop has its own swing feel" : "A slow 6/8 lilt"}>
            6/8 feel
          </Toggle>
          <Toggle on={bass} onClick={() => setBass((v) => !v)}>Bass</Toggle>
          <Toggle on={comp} onClick={() => setComp((v) => !v)}>Chords</Toggle>
          <Toggle on={click} onClick={() => setClick((v) => !v)}>Click</Toggle>
          <Toggle on={countIn} onClick={() => setCountIn((v) => !v)}>Count-in</Toggle>
          <span className="ml-auto font-mono text-[13px] text-muted">space · play / stop</span>
        </div>
      </section>
    </div>
  );
}
