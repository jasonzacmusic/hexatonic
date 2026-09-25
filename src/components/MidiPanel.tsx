"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "@/lib/theory/note";
import type { DrillPosition } from "@/lib/audio/engine";
import { getMidi, grade, GradeReport, MidiPort, midiNoteName } from "@/lib/midi";
import { getAudio } from "@/lib/audio/engine";

interface Props {
  expected: Note[];
  grouping: number;
  stepDur: number;
  playing: boolean;
  /** where the running drill is — its segment says which settings are sounding */
  position?: DrillPosition | null;
}

interface Take {
  expected: Note[];
  grouping: number;
  stepDur: number;
  /** audio time of step 0 of `expected` on this take's grid */
  origin: number;
  from: number;
  /** events before this belong to the previous take */
  since: number;
  seg: number;
}

function takeFrom(p: DrillPosition, since: number): Take {
  const expected = p.plan.notes.filter((n): n is Note => n !== null);
  const from = expected.length ? p.segment.firstPos % expected.length : 0;
  return {
    expected, grouping: p.plan.grouping, stepDur: p.segment.stepDur,
    origin: p.segment.start - from * p.segment.stepDur, from, since, seg: p.segment.id,
  };
}

export default function MidiPanel({ expected, grouping, stepDur, playing, position = null }: Props) {
  const [ports, setPorts] = useState<MidiPort[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [report, setReport] = useState<GradeReport | null>(null);
  const [lastNote, setLastNote] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const wasPlaying = useRef(false);

  const midi = getMidi();
  /* Web MIDI support is a browser fact the server cannot know. Render the
     server's answer first and learn the truth after mount, or React sees two
     different trees and reports a hydration error on every /practice load. */
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(midi.supported); }, [midi]);

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

  /* One take = one stretch of music with one set of settings. A change made
     while playing no longer stops the drill, so when it lands the take so far
     is graded against the drill that was PLAYED, and a new take begins at the
     seam with the new settings. */
  const take = useRef<Take | null>(null);
  const segId = position?.segment.id ?? null;

  useEffect(() => {
    if (!armed) return;
    const gradeTake = (t: Take, until: number) => {
      const events = midi.captured().filter((e) => e.at >= t.since && e.at < until);
      const to = Number.isFinite(until)
        ? Math.round((until - t.origin) / t.stepDur) : t.expected.length;
      if (events.length)
        setReport(grade(t.expected, t.grouping, events, t.origin, t.stepDur, { from: t.from, to }));
    };
    if (playing && !wasPlaying.current) {
      midi.startCapture();
      setReport(null);
      take.current = null;
    }
    if (playing && position) {
      const cur = take.current;
      if (!cur) take.current = takeFrom(position, -Infinity);
      else if (cur.seg !== position.segment.id) {
        gradeTake(cur, position.segment.start);
        take.current = takeFrom(position, position.segment.start);
      }
    }
    if (!playing && wasPlaying.current) {
      const t = take.current ?? {
        expected, grouping, stepDur, origin: getAudio().startTime, from: 0,
        since: -Infinity, seg: -1,
      };
      gradeTake(t, Infinity);
      take.current = null;
    }
    wasPlaying.current = playing;
  // `position` is read through segId on purpose: a new take starts only when a
  // change lands, not on every step.
  }, [playing, armed, midi, segId]);

  useEffect(() => () => { midi.disconnect(); }, [midi]);

  if (!supported) {
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
            <span className="rounded-lg bg-gold px-3 py-1.5 font-mono text-[12px] font-bold text-[#17130a]">
              ♪ {midiNoteName(lastNote)}
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
      <span className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-muted">{l}</span>
    </div>
  );
}
