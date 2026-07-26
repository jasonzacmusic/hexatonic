"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "@/lib/theory/note";
import { getMidi, grade, GradeReport, MidiPort } from "@/lib/midi";
import { getAudio } from "@/lib/audio/engine";

interface Props {
  expected: Note[];
  grouping: number;
  stepDur: number;
  playing: boolean;
}

export default function MidiPanel({ expected, grouping, stepDur, playing }: Props) {
  const [ports, setPorts] = useState<MidiPort[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [report, setReport] = useState<GradeReport | null>(null);
  const [lastNote, setLastNote] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const wasPlaying = useRef(false);

  const midi = getMidi();

  const connect = useCallback(async () => {
    setErr(null);
    midi.useClock(() => getAudio().context?.currentTime ?? performance.now() / 1000);
    midi.onNote = (m) => { setLastNote(m); setTimeout(() => setLastNote(null), 220); };
    const p = await midi.connect();
    setPorts(p);
    setSelected(midi.selectedId);
    if (midi.error) setErr(midi.error);
    else if (!p.length) setErr("No MIDI device found. Plug one in and press connect again.");
  }, [midi]);

  // capture while the drill runs; grade the moment it stops
  useEffect(() => {
    if (!armed) return;
    if (playing && !wasPlaying.current) {
      midi.startCapture();
      setReport(null);
    }
    if (!playing && wasPlaying.current) {
      const a = getAudio();
      const events = midi.captured();
      if (events.length) setReport(grade(expected, grouping, events, a.startTime, stepDur));
    }
    wasPlaying.current = playing;
  }, [playing, armed, midi, expected, grouping, stepDur]);

  useEffect(() => () => { midi.disconnect(); }, [midi]);

  if (!midi.supported) {
    return (
      <section className="card">
        <p className="eyebrow">Play along</p>
        <p className="quiet mt-2">
          This browser has no Web MIDI, so the app cannot listen to a keyboard.
          Chrome and Edge do; Safari and Firefox do not.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="eyebrow">Play along</p>
          <p className="quiet mt-1 max-w-md">
            Connect a MIDI keyboard and the app will grade what you actually played —
            the notes and the accents.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {lastNote !== null && (
            <span className="rounded-lg bg-gold px-3 py-1.5 font-mono text-[11px] font-bold text-[#17130a]">
              ♪ {lastNote}
            </span>
          )}
          {!ports.length ? (
            <button className="btn btn-ghost" onClick={connect}>Connect MIDI</button>
          ) : (
            <>
              <select className="sel !w-auto" value={selected ?? ""}
                      onChange={(e) => { midi.select(e.target.value); setSelected(e.target.value); }}>
                {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="btn btn-ghost" data-on={armed} onClick={() => setArmed((v) => !v)}>
                {armed ? "Grading on" : "Grading off"}
              </button>
            </>
          )}
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-red-hi">{err}</p>}

      {armed && !report && (
        <p className="quiet mt-4">
          Armed. Press play, perform the drill, and the report appears when it stops.
        </p>
      )}

      {report && <Report r={report} />}
    </section>
  );
}

function Report({ r }: { r: GradeReport }) {
  const pct = Math.round(r.accuracy * 100);
  const tone = pct >= 90 ? "text-gold" : pct >= 70 ? "text-amber" : "text-red-hi";
  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap items-end gap-x-9 gap-y-4">
        <Stat v={`${pct}%`} l="notes correct" cls={tone} big />
        <Stat v={`${Math.round(r.accentAccuracy * 100)}%`} l="accents correct" />
        <Stat v={`${r.timingMs.toFixed(0)}ms`} l="average timing error" />
        <Stat v={`${r.biasMs > 0 ? "+" : ""}${r.biasMs.toFixed(0)}ms`}
              l={r.biasMs > 8 ? "you are late" : r.biasMs < -8 ? "you are early" : "dead centre"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1">
        {r.steps.map((s) => (
          <span key={s.index} title={`${s.expectedNote}${s.octaveOff ? " (octave out)" : ""} — ${s.verdict}`}
            className={`h-6 w-3 rounded-sm ${
              s.verdict === "correct" ? (s.octaveOff ? "bg-gold/45" : "bg-gold")
              : s.verdict === "wrong" ? "bg-red-hi"
              : "bg-line"} ${s.isAccent ? "ring-1 ring-cream/40" : ""}`} />
        ))}
      </div>
      <p className="quiet mt-3">
        Gold is right, faded gold is the right note in another octave, red is a wrong
        note, grey is one you did not play. Ringed marks are the accents.
      </p>

      {r.worstNotes.length > 0 && r.worstNotes[0].misses > 0 && (
        <p className="mt-3 text-sm">
          <span className="text-muted">Most often missed:</span>{" "}
          {r.worstNotes.map((w) => `${w.note} (${w.misses}×)`).join(", ")}
        </p>
      )}
      {r.extra > 0 && (
        <p className="quiet mt-1">{r.extra} note{r.extra > 1 ? "s" : ""} played outside the grid.</p>
      )}
    </div>
  );
}

function Stat({ v, l, cls, big }: { v: string; l: string; cls?: string; big?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`num leading-none ${big ? "text-5xl" : "text-2xl"} ${cls ?? ""}`}>{v}</span>
      <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{l}</span>
    </div>
  );
}
