"use client";

/**
 * The 12-bar blues lane.
 *
 * Uses the same vamp scheduler and the same lifecycle guarantee as everything
 * else — but the chords deliberately live OUTSIDE the scale. That is the lesson:
 * the blues is one scale held against moving dominant harmony.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { twelveBar, bluesScales } from "@/lib/theory/blues";
import { buildScale, KEYS } from "@/lib/theory/scales";
import { getAudio, previewAudio } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/audio/usePlayback";
import { Seg, Toggle } from "./Panels";
import Keyboard from "./Keyboard";
import Fretboard from "./Fretboard";

export default function BluesLane({
  instrument, setInstrument,
}: {
  instrument: "keys" | "guitar";
  setInstrument: (v: "keys" | "guitar") => void;
}) {
  const [key, setKey] = useState("C");
  const [quickChange, setQuickChange] = useState(false);
  const [scaleChoice, setScaleChoice] = useState<"blues" | "blues-major">("blues");
  const [bpm, setBpm] = useState(96);
  const [bass, setBass] = useState(true);
  const [comp, setComp] = useState(true);
  const [click, setClick] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [barIdx, setBarIdx] = useState(-1);
  const [countdown, setCountdown] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const raf = useRef<number | null>(null);

  const bars = useMemo(() => twelveBar(key, quickChange), [key, quickChange]);
  const scale = useMemo(() => buildScale(key, scaleChoice), [key, scaleChoice]);
  const advice = useMemo(() => bluesScales(key), [key]);
  const current = barIdx >= 0 ? bars[barIdx] : undefined;

  const clearVisuals = useCallback(() => {
    setBarIdx(-1);
    setCountdown(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);
  const pb = usePlayback("vamp", clearVisuals);
  const playing = pb.playing;
  const stop = useCallback(() => { pb.end(); }, [pb]);

  const play = useCallback(async () => {
    setErr(null);
    await pb.begin(async (guard) => {
      const a = getAudio();
      const ok = await a.startVamp({
        chords: bars.map((b) => ({ bass: b.bass, voicing: b.voicing, bars: 1 })),
        beatDur: 60 / bpm,
        beatsPerBar: 4,
        feel: "swing",
        click, countInBeats: countIn ? 4 : 0, bassOn: bass, compOn: comp,
      });
      if (!ok) { setErr("audio could not start"); return false; }
      if (!guard()) return false;
      const tick = () => {
        if (!guard()) return;
        setBarIdx(a.currentChordIndex());
        setCountdown(a.vampCountdown());
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [bars, bpm, click, countIn, bass, comp, pb]);

  // restart cleanly when the form changes underneath the band
  const sig = `${key}|${quickChange}|${bpm}|${bass}|${comp}|${click}|${countIn}`;
  const last = useRef(sig);
  if (last.current !== sig) { last.current = sig; if (playing) stop(); }

  return (
    <div className="space-y-5">
      {/* the form */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">Twelve bars, three chords</p>
          {countdown > 0 && (
            <span className="num text-2xl text-gold">{countdown}</span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-2.5">
          {bars.map((b, i) => {
            const on = i === barIdx;
            return (
              <button key={i}
                onClick={() => previewAudio([b.bass, ...b.voicing], 0.04)}
                className={`rounded-xl border px-2 py-3 text-center transition ${
                  on ? "border-gold bg-gold text-[#17130a] shadow-[0_6px_24px_-8px_rgba(201,162,39,0.8)]"
                     : "border-line bg-surface2 hover:border-gold/60"}`}>
                <span className="block text-lg font-bold sm:text-xl">{b.symbol}</span>
                <span className={`block font-mono text-[10px] ${on ? "text-[#5a4a12]" : "text-muted"}`}>
                  {b.roman} · bar {i + 1}
                </span>
              </button>
            );
          })}
        </div>
        <p className="quiet mt-4 max-w-3xl">
          Every chord is a dominant 7th, and two of the three are <em>not</em> in your
          scale — that friction is the blues. Land the ♭3 against the I7&rsquo;s major
          third and you have the whole style in one note.
        </p>
      </section>

      {/* controls */}
      <section className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="bl-k">Key</label>
            <select id="bl-k" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Scale on the keys</label>
            <Seg value={scaleChoice} ariaLabel="Scale shown"
                 options={[{ label: "Minor blues", value: "blues" as const },
                           { label: "Major blues", value: "blues-major" as const }]}
                 onChange={setScaleChoice} />
          </div>
          <Toggle on={quickChange} onClick={() => setQuickChange((v) => !v)}
                  title="IV7 in bar 2 — the 'quick change'.">Quick change</Toggle>
        </div>
        <hr className="my-5 border-line" />
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => (playing ? stop() : play())}
                  className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[132px] px-8 py-3.5 text-base tracking-wider`}>
            {playing ? "STOP" : "PLAY"}
          </button>
          <div className="field">
            <label htmlFor="bl-t">Tempo <span className="text-gold">{bpm}</span></label>
            <input id="bl-t" type="range" min={56} max={180} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))} className="w-44" />
          </div>
          <Toggle on={bass} onClick={() => setBass((v) => !v)}>Bass</Toggle>
          <Toggle on={comp} onClick={() => setComp((v) => !v)}>Chords</Toggle>
          <Toggle on={click} onClick={() => setClick((v) => !v)}>Click</Toggle>
          <Toggle on={countIn} onClick={() => setCountIn((v) => !v)}>Count-off</Toggle>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            shuffle feel · always
          </span>
        </div>
        {err && <p className="mt-3 text-sm text-red-hi">{err}</p>}
      </section>

      {/* the instrument, lit by the sounding chord */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">
            {scale.label} {current ? `· ${current.symbol} sounding` : ""}
          </p>
          <Seg value={instrument} ariaLabel="Instrument"
               options={[{ label: "Keys", value: "keys" as const },
                         { label: "Guitar", value: "guitar" as const }]}
               onChange={setInstrument} />
        </div>
        {instrument === "keys" ? (
          <Keyboard scale={scale.notes} removed={null} octaves={3} startMidi={48}
                    chordTonePcs={current?.chordPcs} height={148}
                    onNote={(m) => previewAudio([m])} />
        ) : (
          <Fretboard scale={scale.notes} removed={null}
                     chordTonePcs={current?.chordPcs}
                     onNote={(m) => previewAudio([m])} />
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {advice.map((a) => (
            <div key={a.name} className="rounded-lg border border-line bg-surface2 px-3 py-2">
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="text-[12px] text-muted">{a.notes}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
