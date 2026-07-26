"use client";

/**
 * Improvisation mode.
 *
 * The drill screen teaches you to run patterns. This one asks you to play.
 * A vamp built only from the scale's own harmony loops underneath; the ring and
 * the keyboard show what is available and what the current chord is leaning on.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "@/components/Keyboard";
import ScaleRing from "@/components/ScaleRing";
import { Seg, Toggle } from "@/components/Panels";
import { buildScale, KEYS, DIATONIC_MODES, FAMILIES } from "@/lib/theory/scales";
import {
  buildVamp, vampsFor, vampById, guideTones, VoicingStyle, VampStep,
} from "@/lib/theory/vamps";
import { midi, notePretty, pc } from "@/lib/theory/note";
import { getAudio, previewAudio } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/audio/usePlayback";

const VOICINGS: { label: string; value: VoicingStyle; hint: string }[] = [
  { label: "Shell", value: "shell", hint: "root, 3rd and 7th — the jazz default" },
  { label: "Rootless", value: "rootless", hint: "3-5-7-9, letting the bass own the root" },
  { label: "Quartal", value: "quartal", hint: "stacked fourths — this scale's signature" },
  { label: "Spread", value: "spread", hint: "wide and two-handed, for slow feels" },
];

export default function ImproviseClient() {
  const [key, setKey] = useState("C");
  const [family, setFamily] = useState("diatonic");
  const [mode, setMode] = useState(0);
  const [vampId, setVampId] = useState("tonic");
  const [voicing, setVoicing] = useState<VoicingStyle>("rootless");
  const [bpm, setBpm] = useState(76);
  const [bass, setBass] = useState(true);
  const [comp, setComp] = useState(true);
  const [click, setClick] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [guides, setGuides] = useState(true);
  const [chordIdx, setChordIdx] = useState(-1);
  const [countdown, setCountdown] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const raf = useRef<number | null>(null);

  const scale = useMemo(() => buildScale(key, family, mode), [key, family, mode]);
  const available = useMemo(() => (scale.error ? [] : vampsFor(scale)), [scale]);
  const vamp = vampById(vampId);
  const steps: VampStep[] = useMemo(
    () => (scale.error ? [] : buildVamp(scale, vamp, voicing)),
    [scale, vamp, voicing]
  );

  const current = chordIdx >= 0 ? steps[chordIdx] : undefined;
  const tones = current && !scale.error ? guideTones(scale, current.chord) : null;

  // keep the selected vamp legal for the mode
  useEffect(() => {
    if (available.length && !available.some((v) => v.id === vampId))
      setVampId(available[0].id);
  }, [available, vampId]);

  /* Managed by usePlayback so unmount, route change, tab hide and unload all
     stop the vamp without this screen having to remember. */
  const clearVisuals = useCallback(() => {
    setChordIdx(-1);
    setCountdown(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);
  const pb = usePlayback("vamp", clearVisuals);
  const playing = pb.playing;
  const stop = useCallback(() => { pb.end(); }, [pb]);

  const play = useCallback(async () => {
    if (!steps.length) return;
    setErr(null);
    await pb.begin(async (guard) => {
      const a = getAudio();
      const ok = await a.startVamp({
        chords: steps.map((s) => ({
          bass: s.chord.bass, voicing: s.chord.voicing, bars: s.bars,
        })),
        beatDur: 60 / bpm,
        beatsPerBar: vamp.feel === "68" ? 6 : 4,
        feel: vamp.feel,
        click, countInBeats: countIn ? 4 : 0, bassOn: bass, compOn: comp,
      });
      if (!ok) { setErr("audio could not start"); return false; }
      if (!guard()) return false;
      const tick = () => {
        if (!guard()) return;
        setChordIdx(a.currentChordIndex());
        setCountdown(a.vampCountdown());
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [steps, bpm, vamp.feel, click, bass, comp, countIn, pb]);

  // restart cleanly whenever the musical content changes underneath
  const sig = `${key}|${family}|${mode}|${vampId}|${voicing}|${bpm}|${bass}|${comp}|${click}|${countIn}`;
  const last = useRef(sig);
  useEffect(() => {
    if (last.current !== sig) { last.current = sig; if (playing) { stop(); } }
  }, [sig, playing, stop]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); playing ? stop() : play(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, stop]);

  const isRotation = scale.family.kind === "rotation";
  const chordPcs = guides && current ? current.chord.chordTones : undefined;

  return (
    <div className="space-y-5 pb-10">
      <header className="max-w-2xl pt-2">
        <p className="eyebrow">Improvise</p>
        <h1 className="display mt-3 text-4xl">Stop running patterns.</h1>
        <p className="lede mt-4">
          A vamp built <em>only</em> from this scale&rsquo;s own harmony. Four triads and
          three seventh chords is not a shortage — it is the harmonic world the scale
          lives in, and you can hear all of it in a few bars.
        </p>
      </header>

      {/* ── the stage ─────────────────────────────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="card flex flex-col justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-4">
              <h2 className="display text-3xl">{key}</h2>
              <span className="text-lg font-semibold text-cream/80">{scale.label}</span>
            </div>
            <p className="quiet mt-2 max-w-xl">{vamp.description}</p>
          </div>

          {/* the progression, lighting as it moves */}
          <div className="flex flex-wrap gap-2.5">
            {steps.map((s, i) => {
              const on = i === chordIdx;
              return (
                <button
                  key={i}
                  onClick={() => previewAudio([s.chord.bass, ...s.chord.voicing], 0.04)}
                  className={`rounded-xl border px-5 py-3 text-left transition ${
                    on ? "border-gold bg-gold text-[#17130a] shadow-[0_6px_24px_-8px_rgba(201,162,39,0.8)]"
                       : "border-line bg-surface2 hover:border-gold/60"}`}
                >
                  <span className="block text-2xl font-bold">{s.chord.label}</span>
                  <span className={`block font-mono text-[10px] ${on ? "text-[#5a4a12]" : "text-muted"}`}>
                    {s.chord.altLabel ? `= ${s.chord.altLabel} · ` : ""}{s.bars} bar{s.bars > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {/* guide tones */}
          {guides && tones && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gold/35 bg-gold/[0.06] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                  land on these
                </p>
                <p className="mt-1 font-mono text-xl text-gold">
                  {tones.chordTones.map(notePretty).join("  ")}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface2 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  pass through these
                </p>
                <p className="mt-1 font-mono text-xl text-cream/70">
                  {tones.colourTones.map(notePretty).join("  ")}
                </p>
              </div>
            </div>
          )}
          {guides && !tones && (
            <p className="quiet">
              Press play — the notes to land on will light up as the chords move.
            </p>
          )}
        </div>

        <div className="card flex items-center justify-center lg:w-[330px]">
          <div className="relative">
            <ScaleRing notes={scale.notes} removed={scale.removed} size={278}
                       activePc={null} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {countdown > 0 ? (
                <>
                  <span className="num text-5xl text-gold">{countdown}</span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                    count in
                  </span>
                </>
              ) : current ? (
                <>
                  <span className="num text-3xl text-gold glow-gold">{current.chord.label}</span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                    sounding
                  </span>
                </>
              ) : (
                <>
                  <span className="num text-4xl text-gold">{scale.notes.length}</span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                    notes
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── controls ──────────────────────────────────────────────────── */}
      <section className="card">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="eyebrow">The scale</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="k">Key</label>
                <select id="k" className="sel" value={key} onChange={(e) => setKey(e.target.value)}>
                  {KEYS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="f">Family</label>
                <select id="f" className="sel" value={family}
                        onChange={(e) => { setFamily(e.target.value); setMode(0); }}>
                  {FAMILIES.map((x) => <option key={x.id} value={x.id}>{x.short}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="m">Mode</label>
              <select id="m" className="sel" value={mode} disabled={!isRotation}
                      onChange={(e) => setMode(Number(e.target.value))}>
                {isRotation
                  ? DIATONIC_MODES.map((x) => (
                      <option key={x.index} value={x.index}>{x.name} · {x.degrees}</option>))
                  : <option value={0}>—</option>}
              </select>
            </div>
          </div>

          <div className="space-y-4 lg:border-l lg:border-line lg:pl-5">
            <p className="eyebrow">The bed</p>
            <div className="field">
              <label htmlFor="v">Vamp</label>
              <select id="v" className="sel" value={vampId}
                      onChange={(e) => setVampId(e.target.value)}>
                {available.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Voicing</label>
              <Seg value={voicing} ariaLabel="Voicing style"
                   options={VOICINGS.map((v) => ({ label: v.label, value: v.value }))}
                   onChange={setVoicing} />
              <p className="quiet text-[12px]">
                {VOICINGS.find((v) => v.value === voicing)?.hint}
              </p>
            </div>
          </div>
        </div>

        <hr className="my-5 border-line" />

        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => (playing ? stop() : play())}
                  className={`btn ${playing ? "btn-stop" : "btn-primary"} min-w-[132px] px-8 py-3.5 text-base tracking-wider`}>
            {playing ? "STOP" : "PLAY"}
          </button>
          <div className="field">
            <label htmlFor="t">Tempo <span className="text-gold">{bpm}</span></label>
            <input id="t" type="range" min={40} max={180} value={bpm}
                   onChange={(e) => setBpm(Number(e.target.value))} className="w-44" />
          </div>
          <Toggle on={bass} onClick={() => setBass((v) => !v)}>Bass</Toggle>
          <Toggle on={comp} onClick={() => setComp((v) => !v)}>Chords</Toggle>
          <Toggle on={click} onClick={() => setClick((v) => !v)}>Click</Toggle>
          <Toggle on={countIn} onClick={() => setCountIn((v) => !v)}>Count-off</Toggle>
          <Toggle on={guides} onClick={() => setGuides((v) => !v)}>Guide tones</Toggle>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            space play/stop
          </span>
        </div>
        {err && <p className="mt-3 text-sm text-red-hi">{err}</p>}
      </section>

      <section className="card">
        <Keyboard scale={scale.notes} removed={scale.removed} octaves={3} startMidi={48}
                  chordTonePcs={chordPcs} height={148}
                  onNote={(m) => previewAudio([m])} />
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#F0E4B8] align-middle" />chord tone right now</span>
          <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-cream align-middle" />in the scale</span>
          <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-red align-middle" />removed</span>
        </div>
      </section>

      <section className="card max-w-3xl">
        <p className="eyebrow">How to use this</p>
        <p className="mt-3 text-[15px] leading-relaxed text-cream/80">
          Start with the <strong>drone</strong> and just play the six notes slowly until
          you can hear each one against the root. Then move to a two-chord vamp and
          notice that <em>nothing you play is wrong</em> — every note of the scale is a
          chord tone somewhere. The guide tones tell you what to <em>land</em> on, not
          what you are allowed to play.
        </p>
        <p className="quiet mt-3">
          These are teaching vamps, not transcriptions. The scale&rsquo;s usage in gospel
          and jazz is real, but no published analysis of this exact collection in that
          repertoire exists — so what you hear here is our own pedagogy, not a citation.
        </p>
      </section>
    </div>
  );
}
