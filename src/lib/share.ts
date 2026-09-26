/**
 * Sharing: what every part of the app says when it is shared, and the links
 * and image cards that carry it.
 *
 * Three kinds of share, one card generator (src/app/card/route.tsx):
 *   · page  — any page of the app, with copy written for that page;
 *   · scale — one scale in one key (Sounds, Practice), drawn as the ring
 *             with its removed note in red;
 *   · score — an ear-training set, sent as a challenge: the link opens a
 *             landing page that says the score and asks the friend to beat it.
 *
 * Every card parameter that arrives from a URL goes through `parseCard`,
 * which clamps numbers and accepts only known ids, so a shared link can
 * never make the image say something the app did not.
 */

import { buildScale, familyById, FAMILIES, KEYS, DIATONIC_MODES } from "./theory/scales";
import { decodeCustom } from "./theory/custom";
import { notePretty, pc } from "./theory/note";

export const SITE = "https://hexatonic.nathanielschool.com";

export type CardFormat = "og" | "post" | "story";
export const FORMATS: Record<CardFormat, { w: number; h: number; label: string; use: string }> = {
  og: { w: 1200, h: 630, label: "Link preview", use: "WhatsApp, X, Facebook, messages" },
  post: { w: 1080, h: 1350, label: "Post", use: "Instagram and Facebook feed" },
  story: { w: 1080, h: 1920, label: "Story", use: "Instagram, WhatsApp and Facebook stories" },
};

/* ── page copy ──────────────────────────────────────────────────────────── */

export type PageId =
  | "home" | "practice" | "sounds" | "improvise" | "ear" | "harmony" | "learn" | "resolution" | "about";

export interface PageCopy {
  eyebrow: string;
  title: string;
  /** one line under the title on the card */
  line: string;
  /** the words of the post itself */
  text: string;
  path: string;
}

export const PAGES: Record<PageId, PageCopy> = {
  home: {
    eyebrow: "Hexatonic", title: "Six notes. Every key.", path: "/",
    line: "Remove one note and the tritone goes with it.",
    text: "Practising six-note scales on Hexatonic: free, in the browser, every key, with real piano.",
  },
  practice: {
    eyebrow: "Practice", title: "The drill machine", path: "/practice",
    line: "Any six-note scale, any pattern, groupings of 3 to 9.",
    text: "My practice today: six-note scales in groupings of 3, 4, 5 and 7, and the app tells me which bar they land on.",
  },
  sounds: {
    eyebrow: "Sounds", title: "Every six-note sound", path: "/sounds",
    line: "Blues, gospel, whole tone, augmented, and the six modes.",
    text: "Every six-note scale in one place: blues, gospel, whole tone, augmented and the diatonic modes. Tap to hear any of them.",
  },
  improvise: {
    eyebrow: "Improvise", title: "Play over something", path: "/improvise",
    line: "Backing beds built from the scale's own chords.",
    text: "Improvising over backing beds built only from the scale's own chords. Try it:",
  },
  ear: {
    eyebrow: "Ear training", title: "Train your ear", path: "/ear",
    line: "Major or minor, mode, family, the missing note, groups of 3 to 7.",
    text: "Five quick ear games on six-note scales. How many can you get right out of ten?",
  },
  harmony: {
    eyebrow: "Harmony", title: "What you can build", path: "/harmony",
    line: "The chords inside every six-note scale, and Barry Harris's sixth-diminished.",
    text: "The chords hiding inside six-note scales, and Barry Harris's sixth-diminished system, playable:",
  },
  learn: {
    eyebrow: "Why six notes", title: "Why six notes", path: "/learn",
    line: "Every claim with a button that proves it by ear.",
    text: "Why take one note out of the major scale? The tritone goes with it. Every claim here has a button that proves it by ear:",
  },
  resolution: {
    eyebrow: "Rhythm", title: "Which bar does it land on?", path: "/resolution",
    line: "Groups of 3, 4, 5 and 7 against the bar line.",
    text: "Groups of 5 on a six-note scale land on the one after 5 bars. Work out any grouping:",
  },
  about: {
    eyebrow: "About", title: "Hexatonic", path: "/about",
    line: "Nathaniel School of Music.",
    text: "Hexatonic, a free six-note practice app from Nathaniel School of Music.",
  },
};

export function pageFor(pathname: string): PageId {
  const seg = pathname.split("/")[1] ?? "";
  return (seg && seg in PAGES ? seg : "home") as PageId;
}

/* ── ear-game names (kept here so the card route needs no client code) ──── */

export const GAME_TITLES: Record<string, string> = {
  quality: "Major, minor or suspended?",
  mode: "Which mode?",
  family: "Which family?",
  missing: "Which note is missing?",
  accents: "Groups of 3, 4, 5 or 7?",
};

/* ── the card spec, parsed and clamped ─────────────────────────────────── */

export type CardSpec =
  | { kind: "page"; page: PageId }
  | { kind: "scale"; key: string; family: string; mode: number; custom: string }
  | { kind: "score"; game: string; score: number; total: number; streak: number; rank: string };

const RANK_NAMES = [
  "First listen", "Listener", "Attentive ear", "Keen ear", "Sharp ear", "Trained ear", "Hexatonic ear",
];
const clampInt = (v: string | null, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : dflt;
};

export function parseCard(q: URLSearchParams): { spec: CardSpec; format: CardFormat } {
  const f = q.get("format");
  const format: CardFormat = f === "post" || f === "story" ? f : "og";
  const kind = q.get("kind");
  if (kind === "score") {
    const game = q.get("g") ?? "";
    const total = clampInt(q.get("n"), 1, 50, 10);
    const rank = q.get("r") ?? "";
    return {
      format,
      spec: {
        kind: "score",
        game: game in GAME_TITLES ? game : "quality",
        total,
        score: clampInt(q.get("s"), 0, total, 0),
        streak: clampInt(q.get("st"), 0, 999, 0),
        rank: RANK_NAMES.includes(rank) ? rank : "",
      },
    };
  }
  if (kind === "scale") {
    const key = q.get("k") ?? "";
    const family = q.get("f") ?? "";
    const custom = q.get("cs") ?? "";
    return {
      format,
      spec: {
        kind: "scale",
        key: KEYS.includes(key) ? key : "C",
        family: FAMILIES.some((x) => x.id === family) ? family : "diatonic",
        mode: clampInt(q.get("m"), 0, DIATONIC_MODES.length - 1, 0),
        custom: /^[0-9a-z]{1,3}$/.test(custom) ? custom : "",
      },
    };
  }
  const page = q.get("page") ?? "";
  return { format, spec: { kind: "page", page: (page in PAGES ? page : "home") as PageId } };
}

/** Query string for the card image (and the landing page) of a spec. */
export function cardQuery(spec: CardSpec, format?: CardFormat): string {
  const q = new URLSearchParams();
  q.set("kind", spec.kind);
  if (spec.kind === "page") q.set("page", spec.page);
  if (spec.kind === "scale") {
    q.set("k", spec.key); q.set("f", spec.family);
    if (familyById(spec.family).kind === "rotation") q.set("m", String(spec.mode));
    if (spec.family === "custom" && spec.custom) q.set("cs", spec.custom);
  }
  if (spec.kind === "score") {
    q.set("g", spec.game); q.set("s", String(spec.score)); q.set("n", String(spec.total));
    if (spec.streak) q.set("st", String(spec.streak));
    if (spec.rank) q.set("r", spec.rank);
  }
  if (format && format !== "og") q.set("format", format);
  return q.toString();
}

/* ── what a scale card shows ───────────────────────────────────────────── */

export interface ScaleFace {
  name: string;
  notes: string[];
  pcs: number[];
  removedPc: number | null;
  degrees: string;
  practice: string;
}

export function scaleFace(spec: Extract<CardSpec, { kind: "scale" }>): ScaleFace {
  const fam = familyById(spec.family);
  const s = spec.family === "custom"
    ? buildScale(spec.key, "custom", 0, spec.custom ? decodeCustom(spec.custom) : undefined)
    : buildScale(spec.key, spec.family, spec.mode);
  const pretty = (k: string) => k.replace("#", "♯").replace(/^([A-G])b$/, "$1♭");
  const q = new URLSearchParams({ k: spec.key, f: spec.family });
  if (fam.kind === "rotation") q.set("m", String(spec.mode));
  if (spec.family === "custom" && spec.custom) q.set("cs", spec.custom);
  return {
    name: `${pretty(spec.key)} ${fam.kind === "rotation" ? s.label : fam.short}`,
    notes: s.notes.map(notePretty),
    pcs: s.pcs,
    removedPc: s.removed ? pc(s.removed) : null,
    degrees: s.degrees.join(" ").replace(/b/g, "♭").replace(/#/g, "♯"),
    practice: `/practice?${q}`,
  };
}

/* ── the words ─────────────────────────────────────────────────────────── */

export function scoreText(game: string, score: number, total: number, streak: number, rank: string): string {
  const title = GAME_TITLES[game] ?? "Ear training";
  const perfect = score === total;
  const brag = perfect ? "Perfect set." : score >= 8 ? "Pretty sharp." : score >= 6 ? "Getting there." : "Room to grow.";
  return `I scored ${score}/${total} on "${title}" in Hexatonic ear training. ${brag}` +
    `${streak >= 3 ? ` Best run: ${streak} in a row.` : ""}${rank ? ` Rank: ${rank}.` : ""} Can you beat it?`;
}

export function scaleText(face: ScaleFace): string {
  return `${face.name}: ${face.notes.join(" ")}. Hear it and practise it in any key on Hexatonic.`;
}

/** Full share link: the landing page for a card, which unfurls with its image. */
export const shareLink = (spec: CardSpec): string =>
  spec.kind === "page" ? `${SITE}${PAGES[spec.page].path}` : `${SITE}/c?${cardQuery(spec)}`;
