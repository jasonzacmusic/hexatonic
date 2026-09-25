"use client";

/**
 * The class run-sheet. Built for the teacher's laptop beside the piano: one
 * clock for the whole 90 minutes, the current segment in big type, and every
 * link opening in a new tab so the clock never resets mid-class.
 *
 * Keys: Space start/pause · → next segment · ← previous segment.
 * The clock survives a reload (localStorage), because laptops sleep.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CLASS_PLAN, HOMEWORK, TAKEAWAYS, TOTAL_MIN, Strand } from "@/lib/classPlan";

const STRAND: Record<Strand, { label: string; cls: string }> = {
  theory: { label: "Theory", cls: "border-gold/60 text-gold" },
  ear: { label: "Ear", cls: "border-cream/50 text-cream" },
  piano: { label: "Piano", cls: "border-red/60 text-red" },
};

const STARTS = CLASS_PLAN.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + CLASS_PLAN[i - 1].min], []);
const TOTAL_MS = TOTAL_MIN * 60_000;
const STORE = "hexatonic-class-clock";

const mmss = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function Chips({ strands }: { strands: Strand[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {strands.map((s) => (
        <span key={s} className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${STRAND[s].cls}`}>
          {STRAND[s].label}
        </span>
      ))}
    </span>
  );
}

export default function ClassClient() {
  /* elapsed = banked + (running ? now - since : 0) */
  const [banked, setBanked] = useState(0);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.banked === "number") setBanked(Math.min(Math.max(0, v.banked), TOTAL_MS));
        if (typeof v.since === "number") setSince(v.since);
      }
    } catch { /* no storage: the clock just starts fresh */ }
    setNow(Date.now());
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ banked, since })); } catch { /* ignore */ }
  }, [banked, since]);
  useEffect(() => {
    if (since === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [since]);

  const elapsed = Math.min(TOTAL_MS, banked + (since !== null ? Math.max(0, now - since) : 0));
  const running = since !== null && elapsed < TOTAL_MS;
  const idx = useMemo(() => {
    const m = elapsed / 60_000;
    let i = 0;
    for (let k = 0; k < STARTS.length; k++) if (m >= STARTS[k]) i = k;
    return i;
  }, [elapsed]);
  const seg = CLASS_PLAN[idx];
  const segEnd = (STARTS[idx] + seg.min) * 60_000;
  const segLeft = segEnd - elapsed;

  const toggle = useCallback(() => {
    const t = Date.now();
    if (since !== null) { setBanked((b) => Math.min(TOTAL_MS, b + (t - since))); setSince(null); }
    else { setSince(t); setNow(t); }
  }, [since]);
  const jump = useCallback((i: number) => {
    const k = Math.max(0, Math.min(CLASS_PLAN.length - 1, i));
    const t = Date.now();
    setBanked(STARTS[k] * 60_000);
    setSince((s) => (s !== null ? t : null));
    setNow(t);
  }, []);
  const reset = () => { setBanked(0); setSince(null); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(tag) && e.code === "Space") return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowRight") { e.preventDefault(); jump(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); jump(idx - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, jump, idx]);

  return (
    <div className="space-y-6 pb-10">
      <header className="max-w-3xl pt-2">
        <p className="eyebrow">Public class · run-sheet</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">Hexatonic in ninety minutes.</h1>
        <p className="lede mt-4">
          Theory, ear and piano in every segment — never more than a few minutes of
          talk before hands go on keys or voices go into the room. Nine segments, one
          clock.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <Chips strands={["theory", "ear", "piano"]} />
          <span>Space start/pause · ← → change segment · links open in a new tab</span>
        </p>
      </header>

      {/* ── the clock ─────────────────────────────────────────────────────── */}
      <section className="card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Class clock</p>
            <p className="num mt-1 text-6xl sm:text-7xl">{mmss(elapsed)}<span className="text-2xl text-muted"> / {TOTAL_MIN}:00</span></p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">This segment</p>
            <p className={`num mt-1 text-4xl ${segLeft < 60_000 && running ? "text-red" : "text-gold"}`}>{mmss(segLeft)} left</p>
          </div>
        </div>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface2" role="progressbar"
             aria-valuemin={0} aria-valuemax={TOTAL_MIN} aria-valuenow={Math.floor(elapsed / 60_000)}
             aria-label="Class progress">
          {CLASS_PLAN.map((s, i) => {
            const start = STARTS[i] * 60_000;
            const fill = Math.min(1, Math.max(0, (elapsed - start) / (s.min * 60_000)));
            return (
              <button key={i} onClick={() => jump(i)} title={`${STARTS[i]}′ ${s.title}`}
                      aria-label={`Jump to ${s.title}`}
                      className={`relative h-full border-r border-bg last:border-r-0 ${i === idx ? "bg-white/[0.12]" : "bg-white/[0.04]"}`}
                      style={{ width: `${(s.min / TOTAL_MIN) * 100}%` }}>
                <span className="absolute inset-y-0 left-0 bg-gold/80" style={{ width: `${fill * 100}%` }} />
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className={`btn ${running ? "btn-stop" : "btn-primary"}`} onClick={toggle}>
            {running ? "❚❚ Pause" : elapsed > 0 ? "▶ Resume" : "▶ Start class"}
          </button>
          <button className="btn btn-ghost" onClick={() => jump(idx - 1)} disabled={idx === 0}>◀ Previous</button>
          <button className="btn btn-ghost" onClick={() => jump(idx + 1)} disabled={idx === CLASS_PLAN.length - 1}>Next ▶</button>
          <button className="btn btn-ghost ml-auto" onClick={reset}>Reset</button>
        </div>
      </section>

      {/* ── now ───────────────────────────────────────────────────────────── */}
      <section className="card border-gold/40">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-gold">{STARTS[idx]}′–{STARTS[idx] + seg.min}′</span>
          <Chips strands={seg.strands} />
        </div>
        <h2 className="display mt-3 text-3xl sm:text-4xl">{idx + 1}. {seg.title}</h2>
        <p className="mt-2 text-lg text-cream/90">{seg.goal}</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Say</p>
            <ul className="mt-2 space-y-2">
              {seg.say.map((x, i) => <li key={i} className="border-l-2 border-gold/60 pl-3 text-[17px] leading-relaxed">{x}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Do</p>
            <ul className="mt-2 space-y-2">
              {seg.do.map((x, i) => <li key={i} className="border-l-2 border-red/60 pl-3 text-[17px] leading-relaxed">{x}</li>)}
            </ul>
            <p className="mt-4 rounded-lg bg-surface2 p-3 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">The twist · </span>
              {seg.twist}
            </p>
          </div>
        </div>
        <a href={seg.href} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 inline-block">
          Open: {seg.cta} ↗
        </a>
      </section>

      {/* ── the whole plan ────────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">The whole class</h2>
        <ol className="mt-3 space-y-1.5">
          {CLASS_PLAN.map((s, i) => (
            <li key={i}>
              <button onClick={() => jump(i)}
                      className={`flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-left transition ${
                        i === idx ? "border-gold bg-surface2" : "border-line hover:border-gold"} ${STARTS[i] + s.min <= elapsed / 60_000 ? "opacity-60" : ""}`}>
                <span className="w-16 shrink-0 font-mono text-xs text-muted">{STARTS[i]}′–{STARTS[i] + s.min}′</span>
                <span className="font-semibold">{s.title}</span>
                <span className="ml-auto"><Chips strands={s.strands} /></span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <p className="eyebrow">Five things to remember</p>
          <ol className="mt-4 space-y-3">
            {TAKEAWAYS.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="num text-2xl text-gold">{i + 1}</span>
                <span className="pt-1">{t}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <p className="eyebrow">Homework · 20 minutes a day</p>
          <ul className="mt-4 space-y-2">
            {HOMEWORK.map((h) => (
              <li key={h.day} className="flex gap-3">
                <span className="w-14 shrink-0 font-mono text-xs text-muted pt-0.5">{h.day}</span>
                <span className="flex-1 text-sm">
                  {h.task}{" "}
                  <Link href={h.href} className="text-gold hover:underline">open →</Link>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Students: everything lives at <span className="text-cream">hexatonic.nathanielschool.com</span> — start at{" "}
            <Link href="/workout" className="text-gold hover:underline">/workout</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
