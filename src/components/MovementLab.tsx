"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hexatonicTriadMovement,
  InterlockedMovement,
  MovementStep,
  octatonicSeventhMovement,
} from "@/lib/theory/movement";
import { DIATONIC_MODES, KEYS } from "@/lib/theory/scales";
import { notePretty } from "@/lib/theory/note";
import { previewAudio } from "@/lib/audio/engine";
import { Seg } from "@/components/Panels";

type Shape = "block" | "arpeggio";
type Direction = "up" | "up-down";

function useMovementRun() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [active, setActive] = useState<number | null>(null);

  const cancel = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    setActive(null);
  }, []);

  useEffect(() => cancel, [cancel]);

  const run = useCallback((
    steps: MovementStep[], bpm: number, shape: Shape, direction: Direction,
  ) => {
    cancel();
    const sequence = direction === "up-down"
      ? [...steps, ...steps.slice(0, -1).reverse()]
      : steps;
    const beatMs = 60_000 / bpm;
    const spread = shape === "block" ? 0.015 : 0.12;

    sequence.forEach((step, index) => {
      timers.current.push(setTimeout(() => {
        setActive(step.degree);
        void previewAudio(step.voicing, spread);
      }, index * beatMs));
    });
    timers.current.push(setTimeout(() => setActive(null), sequence.length * beatMs));
  }, [cancel]);

  return { active, cancel, run };
}

function MovementControls({
  id, bpm, setBpm, shape, setShape, direction, setDirection, onRun,
}: {
  id: string;
  bpm: number;
  setBpm: (value: number) => void;
  shape: Shape;
  setShape: (value: Shape) => void;
  direction: Direction;
  setDirection: (value: Direction) => void;
  onRun: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-end gap-4">
      <div className="field">
        <label>Voicing</label>
        <Seg value={shape} ariaLabel="Chord voicing"
             options={[{ label: "block", value: "block" as const },
                       { label: "arpeggio", value: "arpeggio" as const }]}
             onChange={setShape} />
      </div>
      <div className="field">
        <label>Direction</label>
        <Seg value={direction} ariaLabel="Movement direction"
             options={[{ label: "up", value: "up" as const },
                       { label: "up + down", value: "up-down" as const }]}
             onChange={setDirection} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-tempo`}>Tempo · {bpm}</label>
        <input id={`${id}-tempo`} type="range" min={45} max={160} step={1} value={bpm}
               onChange={(event) => setBpm(Number(event.target.value))}
               className="w-40 accent-[#C9A227]" />
      </div>
      <button className="btn btn-primary" onClick={onRun}>▶ Run the movement</button>
    </div>
  );
}

function PairSummary({ movement }: { movement: InterlockedMovement }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {movement.pairLabels.map((label, pair) => {
        const aliases = movement.steps[pair].aliases;
        return (
          <div key={label} className={`rounded-xl border p-4 ${
            pair === 0 ? "border-gold/40 bg-gold/[0.07]" : "border-line bg-surface2"
          }`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              shape {pair === 0 ? "A" : "B"}
            </p>
            <p className={`mt-1 text-2xl font-extrabold ${pair === 0 ? "text-gold" : "text-cream"}`}>
              {label}
            </p>
            {aliases.length > 1 && (
              <p className="mt-2 font-mono text-[11px] text-muted">
                same notes: {aliases.join(" = ")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MovementRow({
  movement, active, shape,
}: {
  movement: InterlockedMovement;
  active: number | null;
  shape: Shape;
}) {
  const spread = shape === "block" ? 0.015 : 0.12;
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {movement.steps.map((step) => (
        <button key={step.degree}
          onClick={() => void previewAudio(step.voicing, spread)}
          aria-label={`Play ${step.label}, ${step.inversion}`}
          className={`rounded-xl border px-4 py-3 text-left transition ${
            active === step.degree
              ? "border-gold bg-gold/15 shadow-[0_0_24px_rgba(201,162,39,0.14)]"
              : step.pair === 0
                ? "border-gold/35 bg-gold/[0.06] hover:border-gold/65"
                : "border-line bg-surface2 hover:border-cream/30"
          }`}>
          <span className={`block text-lg font-extrabold ${step.pair === 0 ? "text-gold" : "text-cream"}`}>
            {step.label}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {step.inversion}
          </span>
          <span className="mt-2 block font-mono text-[11px] text-cream/65">
            {step.notes.map(notePretty).join(" ")}
          </span>
        </button>
      ))}
    </div>
  );
}

function HexatonicMovement() {
  const [key, setKey] = useState("Bb");
  const [mode, setMode] = useState(3);
  const [bpm, setBpm] = useState(92);
  const [shape, setShape] = useState<Shape>("block");
  const [direction, setDirection] = useState<Direction>("up-down");
  const movement = useMemo(() => hexatonicTriadMovement(key, mode), [key, mode]);
  const runner = useMovementRun();
  useEffect(() => runner.cancel(), [key, mode, runner.cancel]);

  return (
    <section className="card">
      <p className="eyebrow">Six notes → two triads</p>
      <h2 className="mt-2 text-2xl font-extrabold">The Music Gym inversion ladder</h2>
      <p className="quiet mt-3 max-w-3xl">
        Take alternate degrees of the six-note scale. Shape A and shape B keep
        switching while every voice rises by one scale step. In six moves you have
        played both triads in root position, first inversion and second inversion.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="field">
          <label htmlFor="movement-key">Key</label>
          <select id="movement-key" className="sel" value={key} onChange={(event) => setKey(event.target.value)}>
            {KEYS.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
        <div className="field min-w-[300px]">
          <label htmlFor="movement-mode">Hexatonic rotation</label>
          <select id="movement-mode" className="sel" value={mode}
                  onChange={(event) => setMode(Number(event.target.value))}>
            {DIATONIC_MODES.map((item) => (
              <option key={item.index} value={item.index}>{item.name} · {item.degrees}</option>
            ))}
          </select>
        </div>
        <p className="font-mono text-lg text-gold">
          {movement.scale.notes.map(notePretty).join(" ")}
        </p>
      </div>

      <PairSummary movement={movement} />
      <MovementControls id="hexatonic-movement" bpm={bpm} setBpm={setBpm} shape={shape} setShape={setShape}
                        direction={direction} setDirection={setDirection}
                        onRun={() => runner.run(movement.steps, bpm, shape, direction)} />
      <MovementRow movement={movement} active={runner.active} shape={shape} />
      <p className="quiet mt-4">
        The B♭ default is the class example: B♭ major and C minor. Change the
        rotation and the same six-note object reveals a different, equally complete pair.
      </p>
    </section>
  );
}

function OctatonicMovement() {
  const [key, setKey] = useState("C");
  const [kind, setKind] = useState<"whole-half" | "half-whole">("whole-half");
  const [bpm, setBpm] = useState(84);
  const [shape, setShape] = useState<Shape>("block");
  const [direction, setDirection] = useState<Direction>("up-down");
  const movement = useMemo(() => octatonicSeventhMovement(key, kind), [key, kind]);
  const runner = useMovementRun();
  useEffect(() => runner.cancel(), [key, kind, runner.cancel]);

  return (
    <section className="card">
      <p className="eyebrow">Eight notes → two diminished sevenths</p>
      <h2 className="mt-2 text-2xl font-extrabold">The true symmetric-octatonic ladder</h2>
      <p className="quiet mt-3 max-w-3xl">
        Alternate degrees of the symmetric octatonic and you get two diminished-seventh
        sets. Each appears four times: root position plus three inversions. Because a
        diminished seventh is symmetrical, every inversion can also be renamed from its bass.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="field">
          <label htmlFor="octatonic-key">Key</label>
          <select id="octatonic-key" className="sel" value={key} onChange={(event) => setKey(event.target.value)}>
            {KEYS.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Rotation</label>
          <Seg value={kind} ariaLabel="Octatonic rotation"
               options={[{ label: "whole–half", value: "whole-half" as const },
                         { label: "half–whole", value: "half-whole" as const }]}
               onChange={setKind} />
        </div>
        <p className="font-mono text-lg text-gold">
          {movement.scale.notes.map(notePretty).join(" ")}
        </p>
      </div>

      <PairSummary movement={movement} />
      <MovementControls id="octatonic-movement" bpm={bpm} setBpm={setBpm} shape={shape} setShape={setShape}
                        direction={direction} setDirection={setDirection}
                        onRun={() => runner.run(movement.steps, bpm, shape, direction)} />
      <MovementRow movement={movement} active={runner.active} shape={shape} />
    </section>
  );
}

export default function MovementLab({ onOpenBarry }: { onOpenBarry: () => void }) {
  return (
    <div className="space-y-5">
      <section className="card border-gold/30">
        <p className="eyebrow">Movement lab</p>
        <h2 className="mt-2 text-3xl font-extrabold">Do not stop at the scale.</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-cream/80">
          The useful pattern is the interlock: two chord shapes, every inversion,
          each voice moving by one scale step. Six-note scales make two triads;
          symmetric eight-note scales make two diminished sevenths.
        </p>
      </section>

      <HexatonicMovement />
      <OctatonicMovement />

      <section className="card border-amber/30">
        <p className="eyebrow text-amber">Keep the third system separate</p>
        <h2 className="mt-2 text-2xl font-extrabold">Barry Harris is eight-note, but not symmetric octatonic.</h2>
        <p className="quiet mt-3 max-w-3xl">
          His four sixth-diminished families interlock a sixth or dominant-seventh
          chord with its related diminished seventh. Major 6 can also be read as a
          relative minor 7; minor 6 as a minor 7♭5. That produces the classroom&rsquo;s
          &ldquo;two seventh-chord shapes&rdquo; reading without misnaming the scale.
        </p>
        <button className="btn btn-ghost mt-4" onClick={onOpenBarry}>
          Open all four Barry Harris movements →
        </button>
      </section>

      <section className="card">
        <p className="eyebrow">Naming repair for the lesson</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Correction title="1 2 3 4 5 6"
                      body="Ionian/Mixolydian hexatonic, or major hexatonic no 7. Peter Martin/Open Studio call this exact collection the Sunday Scale. It is not the major-blues Gospel Scale." />
          <Correction title="Whole–half / half–whole"
                      body="The symmetric octatonic: three transpositions, alternating two diminished-seventh sets." />
          <Correction title="Barry Harris"
                      body="Four eight-note sixth-diminished families. A movement system, not another name for the symmetric octatonic." />
        </div>
      </section>
    </div>
  );
}

function Correction({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface2 p-4">
      <h3 className="font-semibold text-cream">{title}</h3>
      <p className="quiet mt-2">{body}</p>
    </div>
  );
}
