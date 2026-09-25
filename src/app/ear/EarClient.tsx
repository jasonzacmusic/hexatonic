"use client";

/**
 * Ear training: five short games.
 *
 * Every round sets the key first (a tonic drone, or a cadence in the
 * missing-note game), asks one question with big answers, then plays your pick
 * and the right answer back to back with the notes lighting as they sound.
 * Question generation lives in src/lib/ear/games.ts and is tested there.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_OPTIONS, GAMES, GameId, Options, Question, Reveal, gameById, makeQuestion,
} from "@/lib/ear/games";
import { EAR_KEYS } from "@/lib/ear/sounds";
import { useEarPlayer } from "@/lib/ear/useEarPlayer";
import GamePicker, { Tally } from "@/components/ear/GamePicker";
import ChipRow from "@/components/ear/ChipRow";

const TEMPOS = [
  { id: 90, label: "Slow" },
  { id: 120, label: "Medium" },
  { id: 150, label: "Quick" },
];
const EMPTY: Tally = { right: 0, total: 0, streak: 0, best: 0 };
const STORE = "hx-ear-scores-v1";
const SITE = "https://hexatonic.nathanielschool.com/ear";

const pretty = (k: string) => k.replace("#", "♯").replace(/b$/, "♭");

function Seg<T extends string | number>({
  label, value, options, onChange,
}: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.id)} type="button" data-on={o.id === value}
                  aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EarClient() {
  const [game, setGame] = useState<GameId>("quality");
  const [opts, setOpts] = useState<Options>(DEFAULT_OPTIONS);
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [scores, setScores] = useState<Partial<Record<GameId, Tally>>>({});
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const prevKey = useRef<string | null>(null);
  const player = useEarPlayer();

  /* deep link (?game=mode) and remembered scores: conveniences only */
  useEffect(() => {
    try {
      const g = new URLSearchParams(window.location.search).get("game");
      if (g && GAMES.some((x) => x.id === g)) setGame(g as GameId);
      const saved = window.localStorage.getItem(STORE);
      if (saved) setScores(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(STORE, JSON.stringify(scores)); } catch {}
  }, [scores]);

  const info = gameById(game);
  const tally = scores[game] ?? EMPTY;
  const set = <K extends keyof Options>(k: K, v: Options[K]) => setOpts((o) => ({ ...o, [k]: v }));

  const choose = useCallback((id: GameId) => {
    if (id === game) return;
    player.stop();
    setGame(id);
    setQ(null); setPicked(null); setReveal(null);
  }, [game, player]);

  const next = useCallback(() => {
    const question = makeQuestion(game, opts, prevKey.current);
    prevKey.current = question.key;
    setQ(question); setPicked(null); setReveal(null);
    void player.play(question.prompt, "prompt");
  }, [game, opts, player]);

  const replay = useCallback(() => {
    if (q) void player.play(q.prompt, "prompt");
  }, [q, player]);

  const answer = useCallback((id: string) => {
    if (!q || picked) return;
    const r = q.reveal(id);
    setPicked(id);
    setReveal(r);
    setScores((all) => {
      const s = all[game] ?? EMPTY;
      const streak = r.right ? s.streak + 1 : 0;
      return { ...all, [game]: {
        right: s.right + (r.right ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak),
      } };
    });
    void player.play(r.program, "reveal");
  }, [q, picked, game, player]);

  const hearReveal = useCallback(() => {
    if (reveal) void player.play(reveal.program, "reveal");
  }, [reveal, player]);

  /* keyboard: 1–6 answer, Space replays, Enter moves on */
  const keys = useRef({ next, replay, answer, q, picked });
  keys.current = { next, replay, answer, q, picked };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const k = keys.current;
      if (e.type === "keyup") {
        if (e.key === " ") e.preventDefault();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (k.q) k.replay(); else k.next();
      } else if (e.key === "Enter") {
        if (!k.q || k.picked) { e.preventDefault(); k.next(); }
      } else if (/^[1-6]$/.test(e.key) && k.q && !k.picked) {
        const c = k.q.choices[Number(e.key) - 1];
        if (c) { e.preventDefault(); k.answer(c.id); }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const share = async () => {
    const pct = tally.total ? Math.round((tally.right / tally.total) * 100) : 0;
    const text =
      `Hexatonic ear training · ${info.title} ${tally.right}/${tally.total} (${pct}%), ` +
      `best streak ${tally.best}. ${SITE}?game=${game}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const levelSeg = useMemo(() => {
    if (game === "mode")
      return { label: "Choices", options: [{ id: 1 as const, label: "3 modes" }, { id: 2 as const, label: "All 6" }] };
    if (game === "family")
      return { label: "Level", options: [{ id: 1 as const, label: "3 families" }, { id: 2 as const, label: "6 families" }] };
    if (game === "accents")
      return { label: "Level", options: [{ id: 1 as const, label: "With the melody" }, { id: 2 as const, label: "Accents only" }] };
    return null;
  }, [game]);

  const summary = [
    TEMPOS.find((t) => t.id === opts.tempo)?.label,
    levelSeg?.options.find((o) => o.id === opts.level)?.label,
    game === "missing" ? (opts.parent === "both" ? "major + minor" : opts.parent) : null,
    game === "missing" ? (opts.order === "up" ? "in order" : "scrambled") : null,
    opts.fixedKey ? `key of ${pretty(opts.fixedKey)}` : null,
  ].filter(Boolean).join(" · ");

  const lit = (row: string) => (player.lit && player.lit.row === row && player.tag === "reveal" ? player.lit.chips : null);
  const inPrompt = player.playing && player.tag === "prompt";
  const listening = inPrompt && player.pulse > 0;
  const cols =
    game === "missing" ? "grid-cols-3 sm:grid-cols-6"
    : game === "accents" ? "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className="space-y-6 pb-12">
      <header className="max-w-2xl pt-2">
        <p className="eyebrow">Ear training</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">Train your ear</h1>
        <p className="lede mt-4">
          Five short games. Each round sets the key first, then asks one question.
          When you answer, you hear your pick and the right answer back to back.
        </p>
      </header>

      <GamePicker games={GAMES} current={game} scores={scores} onPick={choose} />

      <section className="card" aria-labelledby="ear-game-title">
        {/* title + score */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="ear-game-title" className="display text-[28px] sm:text-[32px]">{info.title}</h2>
            <p className="mt-2 text-[15px] text-cream/75">{info.line}</p>
          </div>
          <dl className="flex items-baseline gap-5 font-mono text-[13px] text-muted">
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Score</dt>
              <dd><b className="num text-[26px] text-cream">{tally.right}</b><span>/{tally.total}</span></dd>
            </div>
            <div className="flex items-baseline gap-1.5"><dt>streak</dt><dd className="num text-[17px] text-cream">{tally.streak}</dd></div>
            <div className="flex items-baseline gap-1.5"><dt>best</dt><dd className="num text-[17px] text-cream">{tally.best}</dd></div>
          </dl>
        </div>

        {/* settings: they apply from the next round, never to the one sounding.
            On a phone they fold behind one button so the question stays on screen. */}
        <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-line bg-surface2 px-4 py-3 text-left sm:hidden">
          <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/70">Settings</span>
          <span className="text-[14px] text-cream/85">{summary} <span aria-hidden className="ml-1 text-muted">{showSettings ? "▴" : "▾"}</span></span>
        </button>
        <div className={`${showSettings ? "flex" : "hidden"} mt-4 flex-wrap items-end gap-x-5 gap-y-4 sm:mt-5 sm:flex sm:border-t sm:border-line sm:pt-5`}>
          <Seg label="Tempo" value={opts.tempo} options={TEMPOS} onChange={(v) => set("tempo", v)} />
          {levelSeg && (
            <Seg label={levelSeg.label} value={opts.level} options={levelSeg.options}
                 onChange={(v) => set("level", v)} />
          )}
          {game === "missing" && (
            <>
              <Seg label="Scale" value={opts.parent}
                   options={[{ id: "major", label: "Major" }, { id: "minor", label: "Minor" }, { id: "both", label: "Both" }]}
                   onChange={(v) => set("parent", v)} />
              <Seg label="Key set by" value={opts.keySet}
                   options={[{ id: "cadence", label: "Cadence" }, { id: "drone", label: "Drone" }]}
                   onChange={(v) => set("keySet", v)} />
              <Seg label="Order" value={opts.order}
                   options={[{ id: "up", label: "In order" }, { id: "scrambled", label: "Scrambled" }]}
                   onChange={(v) => set("order", v)} />
            </>
          )}
          <div className="field">
            <label htmlFor="ear-key">Key</label>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost min-h-[42px]" data-on={opts.fixedKey !== null}
                      aria-pressed={opts.fixedKey !== null}
                      onClick={() => set("fixedKey", opts.fixedKey ? null : (q?.key && EAR_KEYS.includes(q.key) ? q.key : "G"))}>
                {opts.fixedKey ? "Same key all session" : "New key each round"}
              </button>
              {opts.fixedKey && (
                <select id="ear-key" className="sel w-[84px]" value={opts.fixedKey}
                        onChange={(e) => set("fixedKey", e.target.value)}>
                  {EAR_KEYS.map((k) => <option key={k} value={k}>{pretty(k)}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
        <p className={`${showSettings ? "block" : "hidden"} mt-3 font-mono text-[13px] text-muted sm:block`}>Changes apply from the next round.</p>

        {/* the stage */}
        <div className="well mt-5 sm:p-5">
          <div className="flex flex-wrap items-center gap-4">
            {!q ? (
              <button type="button" className="btn btn-primary min-h-[52px] px-8 text-[16px]" onClick={next}>
                Start
              </button>
            ) : (
              <button type="button" className="btn btn-ghost min-h-[48px] px-5 text-[15px]" onClick={replay}>
                Hear it again <kbd className="hidden font-mono text-[13px] text-muted sm:inline">Space</kbd>
              </button>
            )}
            <div className="flex min-h-[48px] items-center gap-3" aria-live="polite">
              <span aria-hidden
                className={`h-3.5 w-3.5 rounded-full border ${
                  listening ? "border-gold bg-gold" : "border-cream/30 bg-transparent"}`} />
              <span className="font-serif text-[21px] italic text-cream/90">
                {player.loading ? "Loading the piano…"
                  : player.error ? player.error
                  : player.phase ?? (q ? (picked ? "Enter for the next round." : "Your answer?") : "Press Start, or Enter.")}
              </span>
              {q && <span className="whitespace-nowrap font-mono text-[13px] text-muted">key of {pretty(q.key)}</span>}
            </div>
          </div>

          {q && (
            <div className={`mt-5 grid gap-2.5 ${cols}`}>
              {q.choices.map((c, i) => {
                const isPick = picked === c.id;
                const isTruth = picked !== null && c.id === q.answer;
                const look = isTruth
                  ? "border-cream bg-cream text-bg"
                  : isPick ? "border-cream/60 bg-surface2 text-cream"
                  : picked ? "border-line bg-surface2 text-cream opacity-70"
                  : "border-line-control/70 bg-surface2 text-cream hover:border-cream/60 hover:bg-[#23201B]";
                return (
                  <button key={c.id} type="button" onClick={() => answer(c.id)} disabled={picked !== null}
                    className={`relative flex min-h-[72px] flex-col justify-center rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,transform] duration-150 ease-out enabled:active:scale-[0.98] ${look}`}>
                    <span className={`absolute right-3 top-2.5 font-mono text-[13px] ${isTruth ? "text-bg/70" : "text-muted"}`}>
                      {i + 1}
                    </span>
                    <span className="pr-5 text-[19px] font-bold leading-tight">{c.label}</span>
                    {c.hint && (
                      <span className={`mt-1 text-[14px] leading-snug ${isTruth ? "text-bg/75" : "text-cream/70"}`}>{c.hint}</span>
                    )}
                    {isTruth && <span className="mt-1.5 font-mono text-[13px] uppercase tracking-[0.08em]">Right answer</span>}
                    {isPick && !isTruth && <span className="mt-1.5 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75">Your pick</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* the reveal */}
        {reveal && (
          <div className="hx-rise mt-6 space-y-5 border-t border-line pt-6">
            <div>
              <p className="text-[20px] font-bold leading-snug text-cream">
                <span aria-hidden className="mr-2 font-mono text-[18px]">{reveal.right ? "✓" : "✗"}</span>
                {reveal.verdict}
              </p>
              <p className="mt-2 font-serif text-[23px] italic leading-snug text-cream/90">{reveal.tell}</p>
              {reveal.detail && <p className="mt-2 text-[15px] leading-relaxed text-cream/75">{reveal.detail}</p>}
            </div>
            <div className="space-y-4">
              {reveal.rows.map((row) => <ChipRow key={row.id} row={row} lit={lit(row.id)} />)}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-ghost min-h-[48px] px-5 text-[15px]" onClick={hearReveal}>
                {reveal.right ? "Hear the answer again" : "Hear both again"}
              </button>
              <button type="button" className="btn btn-primary min-h-[48px] px-6 text-[15px]" onClick={next}>
                Next round <kbd className="hidden font-mono text-[13px] opacity-70 sm:inline">Enter</kbd>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="hidden font-mono text-[13px] text-muted sm:block">
            Keys: <b className="text-cream/85">1–{q ? q.choices.length : 6}</b> answer ·{" "}
            <b className="text-cream/85">Space</b> replay · <b className="text-cream/85">Enter</b> next
          </p>
          {tally.total > 0 && (
            <button type="button" className="btn btn-ghost" onClick={share}>
              {copied ? "Copied" : "Copy my score"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
