"use client";

/**
 * Ear training: five short games, each with levels.
 *
 * Every round sets the key first (a tonic drone, or a cadence in the
 * missing-note game), plays a short tune or rhythm, and asks one question.
 * When you answer, you hear your pick and the right answer back to back while
 * the keyboard, the ring and the note chips light. Ten questions make a
 * session, which ends with what you mix up most and what to listen for.
 *
 * Question generation lives in src/lib/ear/games.ts, levels and the summary
 * in src/lib/ear/progress.ts; both are tested.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_OPTIONS, GAMES, GameId, LEVELS, Options, Question, Reveal, gameById, makeQuestion,
} from "@/lib/ear/games";
import {
  AllProgress, Attempt, SESSION_LENGTH, freshAll, loadProgress, recordAnswer, summarise,
} from "@/lib/ear/progress";
import { EAR_KEYS } from "@/lib/ear/sounds";
import { useEarPlayer } from "@/lib/ear/useEarPlayer";
import GamePicker from "@/components/ear/GamePicker";
import ChipRow from "@/components/ear/ChipRow";
import LevelBar from "@/components/ear/LevelBar";
import Musical from "@/components/ear/Musical";
import RevealVisual from "@/components/ear/RevealVisual";
import SessionSummary from "@/components/ear/SessionSummary";

const TEMPOS = [
  { id: 84, label: "Slow" },
  { id: 108, label: "Medium" },
  { id: 132, label: "Quick" },
];
const STORE = "hx-ear-progress-v2";
const LEGACY = "hx-ear-scores-v1";
const SITE = "https://hexatonic.nathanielschool.com/ear";

const pretty = (k: string) => k.replace("#", "♯").replace(/b$/, "♭");
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (k: string) => (LETTER_PC[k[0]] + (k[1] === "#" ? 1 : k[1] === "b" ? 11 : 0)) % 12;
/** The key menu's name for the pitch just heard (C♯ is on the menu as D♭). */
const sameKey = (tonicPc?: number) =>
  tonicPc === undefined ? "G" : EAR_KEYS.find((k) => pcOf(k) === tonicPc) ?? "G";

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

const EMPTY_SESSION = (): Record<GameId, Attempt[]> =>
  Object.fromEntries(GAMES.map((g) => [g.id, []])) as unknown as Record<GameId, Attempt[]>;

export default function EarClient() {
  const [game, setGame] = useState<GameId>("quality");
  const [opts, setOpts] = useState<Pick<Options, "tempo" | "fixedKey">>(DEFAULT_OPTIONS);
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [progress, setProgress] = useState<AllProgress>(freshAll);
  const [opened, setOpened] = useState<number | null>(null);
  const [session, setSession] = useState(EMPTY_SESSION);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const loaded = useRef(false);
  const prevKey = useRef<string | null>(null);
  const player = useEarPlayer();

  /* deep link (?game=mode) and remembered progress: conveniences only */
  useEffect(() => {
    try {
      const g = new URLSearchParams(window.location.search).get("game");
      if (g && GAMES.some((x) => x.id === g)) setGame(g as GameId);
    } catch {}
    try {
      setProgress(loadProgress(window.localStorage.getItem(STORE), window.localStorage.getItem(LEGACY)));
    } catch {}
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { window.localStorage.setItem(STORE, JSON.stringify(progress)); } catch {}
  }, [progress]);

  const info = gameById(game);
  const prog = progress[game];
  const levels = LEVELS[game];
  const attempts = session[game];
  const sessionDone = attempts.length >= SESSION_LENGTH;
  const set = <K extends keyof typeof opts>(k: K, v: (typeof opts)[K]) => setOpts((o) => ({ ...o, [k]: v }));

  const setLevel = useCallback((n: number) => {
    setProgress((all) => ({ ...all, [game]: { ...all[game], level: Math.min(n, all[game].unlocked) } }));
  }, [game]);

  const choose = useCallback((id: GameId) => {
    if (id === game) return;
    player.stop();
    setGame(id);
    setQ(null); setPicked(null); setReveal(null); setOpened(null);
  }, [game, player]);

  const next = useCallback((levelOverride?: number) => {
    if (session[game].length >= SESSION_LENGTH)
      setSession((s) => ({ ...s, [game]: [] }));
    const level = levelOverride ?? progress[game].level;
    const question = makeQuestion(game, { ...opts, level }, prevKey.current);
    prevKey.current = question.key;
    setQ(question); setPicked(null); setReveal(null); setOpened(null);
    void player.play(question.prompt, "prompt");
  }, [game, opts, player, progress, session]);

  const replay = useCallback(() => {
    if (q) void player.play(q.prompt, "prompt");
  }, [q, player]);

  const answer = useCallback((id: string) => {
    if (!q || picked) return;
    const r = q.reveal(id);
    setPicked(id);
    setReveal(r);
    const rec = recordAnswer(game, progress[game], r.right, q.level);
    setProgress((all) => ({ ...all, [game]: rec.progress }));
    setOpened(rec.unlocked);
    setSession((s) => ({ ...s, [game]: [...s[game], { answer: q.answer, pick: id }] }));
    void player.play(r.program, "reveal");
  }, [q, picked, game, player, progress]);

  const hearReveal = useCallback(() => {
    if (reveal) void player.play(reveal.program, "reveal");
  }, [reveal, player]);

  const goLevel = useCallback((n: number) => {
    setLevel(n);
    setSession((s) => ({ ...s, [game]: [] }));
    next(n);
  }, [game, next, setLevel]);

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

  const summary = sessionDone ? summarise(game, attempts) : null;

  const share = async () => {
    const pct = prog.total ? Math.round((prog.right / prog.total) * 100) : 0;
    const lvl = `level ${prog.level} of ${levels.length} (${levels[prog.level - 1].name})`;
    const text = summary
      ? `Hexatonic ear training · ${info.title} · ${lvl}: ${summary.right}/${summary.total} this session. ${SITE}?game=${game}`
      : `Hexatonic ear training · ${info.title} · ${lvl}: ${prog.right}/${prog.total} (${pct}%), best streak ${prog.best}. ${SITE}?game=${game}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const settingsLine = [
    TEMPOS.find((t) => t.id === opts.tempo)?.label,
    opts.fixedKey ? `key of ${pretty(opts.fixedKey)}` : "new key each round",
  ].filter(Boolean).join(" · ");

  const lit = (row: string) => (player.lit && player.lit.row === row && player.tag === "reveal" ? player.lit.chips : null);
  const revealLit = player.tag === "reveal" ? player.lit : null;
  const inPrompt = player.playing && player.tag === "prompt";
  const listening = inPrompt && player.pulse > 0;
  const n = q?.choices.length ?? 3;
  const cols =
    game === "missing" ? "grid-cols-3 sm:grid-cols-6"
    : n <= 2 ? "grid-cols-2"
    : n === 3 ? "grid-cols-3"
    : n === 4 ? "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3";
  const openUnchosen = prog.unlocked > prog.level
    ? { n: prog.unlocked, name: levels[prog.unlocked - 1].name } : null;
  const questionNo = Math.min(attempts.length + (q && !picked ? 1 : 0), SESSION_LENGTH);

  return (
    <div className="space-y-5 pb-12">
      <header className="max-w-2xl pt-2">
        <p className="eyebrow">Ear training</p>
        <h1 className="display mt-2 text-[34px] sm:mt-3 sm:text-5xl">Train your ear</h1>
        {/* On a phone the cards say what each game is; the question comes first. */}
        <p className="lede mt-3 hidden sm:block">
          Five short games, each with levels. Every round sets the key, plays a short tune,
          and asks one question. Then you hear your pick and the answer back to back.
        </p>
      </header>

      <GamePicker games={GAMES} current={game} scores={progress} onPick={choose} />

      <section className="card" aria-labelledby="ear-game-title">
        {/* title + score */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            {/* On a phone the highlighted card above already names the game. */}
            <h2 id="ear-game-title" className="display sr-only text-[32px] sm:not-sr-only">{info.title}</h2>
            <p className="mt-1.5 hidden text-[15px] text-cream/75 sm:block">{info.line}</p>
          </div>
          <dl className="flex items-baseline gap-5 font-mono text-[13px] text-muted">
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Score</dt>
              <dd><b className="num text-[26px] text-cream">{prog.right}</b><span>/{prog.total}</span></dd>
            </div>
            <div className="flex items-baseline gap-1.5"><dt>streak</dt><dd className="num text-[17px] text-cream">{prog.streak}</dd></div>
            <div className="flex items-baseline gap-1.5"><dt>best</dt><dd className="num text-[17px] text-cream">{prog.best}</dd></div>
          </dl>
        </div>

        <div className="mt-3 border-t border-line pt-3 sm:mt-4 sm:pt-4">
          <LevelBar levels={levels} progress={prog} level={prog.level} onPick={setLevel} />
        </div>

        {/* settings: they apply from the next round, never to the one sounding.
            On a phone they fold behind one button so the question stays on screen. */}
        <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}
                className="mt-4 flex min-h-[48px] w-full items-center justify-between rounded-xl border border-line bg-surface2 px-4 py-2.5 text-left sm:hidden">
          <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-cream/70">Settings</span>
          <span className="text-[14px] text-cream/85">{settingsLine} <span aria-hidden className="ml-1 text-muted">{showSettings ? "▴" : "▾"}</span></span>
        </button>
        <div className={`${showSettings ? "flex" : "hidden"} mt-4 flex-wrap items-end gap-x-5 gap-y-4 sm:flex`}>
          <Seg label="Tempo" value={opts.tempo} options={TEMPOS} onChange={(v) => set("tempo", v)} />
          <div className="field">
            <label htmlFor="ear-key">Key</label>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost min-h-[42px]" data-on={opts.fixedKey !== null}
                      aria-pressed={opts.fixedKey !== null}
                      onClick={() => set("fixedKey", opts.fixedKey ? null : sameKey(q?.tonicPc))}>
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
          <p className="pb-2.5 font-mono text-[13px] text-muted">Level, tempo and key apply from the next round.</p>
        </div>

        {/* the stage */}
        <div className="well mt-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {!q ? (
              <button type="button" className="btn btn-primary min-h-[52px] px-8 text-[16px]" onClick={() => next()}>
                Start
              </button>
            ) : (
              <button type="button" className="btn btn-ghost min-h-[48px] px-5 text-[15px]" onClick={replay}>
                Hear it again <kbd className="hidden font-mono text-[13px] text-muted sm:inline">Space</kbd>
              </button>
            )}
            <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3" aria-live="polite">
              <span aria-hidden
                className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                  listening ? "border-gold bg-gold" : "border-cream/30 bg-transparent"}`} />
              <span className="font-serif text-[21px] italic leading-tight text-cream/90">
                {player.loading ? "Loading the piano…"
                  : player.error ? player.error
                  : player.phase ?? (q ? (picked ? (sessionDone ? "Session done." : "Enter for the next round.") : "Your answer?") : "Press Start, or Enter.")}
              </span>
            </div>
            {q && (
              <span className="order-first flex basis-full items-center justify-between gap-3 whitespace-nowrap font-mono text-[13px] text-muted sm:order-none sm:basis-auto sm:justify-start">
                <span>key of {pretty(q.key)}</span>
                <span aria-label={`Question ${questionNo} of ${SESSION_LENGTH}`}>{questionNo}/{SESSION_LENGTH}</span>
              </span>
            )}
          </div>

          {q && (
            <div className={`mt-4 grid gap-2.5 ${cols}`}>
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
                    className={`relative flex min-h-[76px] flex-col justify-center rounded-2xl border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-150 ease-out enabled:active:scale-[0.98] sm:px-4 ${look}`}>
                    <span className={`absolute right-3 top-2.5 hidden font-mono text-[13px] sm:inline ${isTruth ? "text-bg/70" : "text-muted"}`}>
                      {i + 1}
                    </span>
                    <span className="text-[17px] font-bold leading-tight sm:pr-5 sm:text-[19px]">{c.label}</span>
                    {c.hint && (
                      <span className={`mt-1 text-[14px] leading-snug ${isTruth ? "text-bg/75" : "text-cream/70"}`}>{c.hint}</span>
                    )}
                    {isTruth && <span className="mt-1.5 font-mono text-[13px] uppercase tracking-[0.08em]">Answer</span>}
                    {isPick && !isTruth && <span className="mt-1.5 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/75">Your pick</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* the reveal */}
        {reveal && (
          <div className="hx-rise mt-5 space-y-4 border-t border-line pt-5">
            <div>
              <p className="text-[19px] font-bold leading-snug text-cream sm:text-[20px]">
                <span aria-hidden className="mr-2 font-mono text-[18px]">{reveal.right ? "✓" : "✗"}</span>
                <Musical text={reveal.verdict} />
              </p>
              <p className="mt-2 font-serif text-[22px] italic leading-snug text-cream/90 sm:text-[23px]"><Musical text={reveal.tell} /></p>
              {reveal.detail && <p className="mt-2 text-[15px] leading-relaxed text-cream/75"><Musical text={reveal.detail} /></p>}
            </div>
            {opened && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cream/40 bg-surface2 px-4 py-3">
                <p className="text-[15px] font-bold text-cream">
                  Level {opened} is open: {levels[opened - 1].name}.
                </p>
                <button type="button" className="btn btn-ghost min-h-[44px]" onClick={() => goLevel(opened)}>
                  Play level {opened}
                </button>
              </div>
            )}
            {reveal.tonicMidi !== undefined && (
              <RevealVisual rows={reveal.rows} lit={revealLit} sounding={player.sounding} tonicMidi={reveal.tonicMidi} />
            )}
            <div className="space-y-3.5">
              {reveal.rows.map((row) => <ChipRow key={row.id} row={row} lit={lit(row.id)} />)}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-ghost min-h-[48px] px-5 text-[15px]" onClick={hearReveal}>
                {reveal.right ? "Hear the answer again" : "Hear both again"}
              </button>
              {!sessionDone && (
                <button type="button" className="btn btn-primary min-h-[48px] px-6 text-[15px]" onClick={() => next()}>
                  Next round <kbd className="hidden font-mono text-[13px] opacity-70 sm:inline">Enter</kbd>
                </button>
              )}
            </div>
          </div>
        )}

        {summary && (
          <SessionSummary summary={summary} nextLevel={openUnchosen}
                          onNextLevel={() => openUnchosen && goLevel(openUnchosen.n)}
                          onAgain={() => next()} />
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="hidden font-mono text-[13px] text-muted sm:block">
            Keys: <b className="text-cream/85">1–{q ? q.choices.length : 6}</b> answer ·{" "}
            <b className="text-cream/85">Space</b> replay · <b className="text-cream/85">Enter</b> next
          </p>
          {prog.total > 0 && (
            <button type="button" className="btn btn-ghost" onClick={share}>
              {copied ? "Copied" : summary ? "Copy my session" : "Copy my score"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
