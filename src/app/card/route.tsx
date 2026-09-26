/**
 * Share cards. One generator for every share in the app, in three sizes:
 *   og    1200×630   link previews (WhatsApp, X, Facebook, iMessage)
 *   post  1080×1350  Instagram / Facebook feed
 *   story 1080×1920  Instagram / WhatsApp / Facebook stories
 *
 * Every parameter goes through parseCard (src/lib/share.ts), which accepts
 * only known ids and clamps numbers, so a link cannot make a card say
 * anything the app did not.
 *
 * Brand (docs/DESIGN-BRIEF-CLAUDE-DESIGN.md): near-black ground, cream type,
 * gold for the notes of the scale, red ONLY for the removed note.
 */

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import {
  CardFormat, CardSpec, FORMATS, GAME_TITLES, PAGES, parseCard, scaleFace,
} from "@/lib/share";

export const runtime = "edge";

const BG = "#0A0908", SURFACE = "#14120F", CREAM = "#F4EFE4", MUTED = "#9A9087";
const GOLD = "#C9A227", RED = "#E8666C", LINE = "#2A2523";
const NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

/* The brand face, Archivo, fetched once per instance as TTF (the image
   renderer cannot read woff2, and Google serves TTF to a plain user agent).
   If the fetch fails the card still renders, in the default sans. */
type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 900; style: "normal" };
let fonts: Promise<LoadedFont[]> | null = null;
async function fetchFont(weight: 400 | 900): Promise<LoadedFont> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Archivo:wght@${weight}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("no ttf");
  return { name: "Archivo", data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" };
}
const loadFonts = () =>
  (fonts ??= Promise.all([fetchFont(400), fetchFont(900)]).catch(() => { fonts = null; return []; }));
const FACE = "Archivo, sans-serif";

/** The brand mark: six dots, one hollow red. */
function Mark({ size }: { size: number }) {
  const r = size / 2;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const d = size * (i === 4 ? 0.23 : 0.26);
        const x = r + r * 0.68 * Math.cos(a) - d / 2, y = r + r * 0.68 * Math.sin(a) - d / 2;
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y, width: d, height: d, borderRadius: d,
            display: "flex",
            background: i === 4 ? "transparent" : GOLD,
            border: i === 4 ? `${Math.max(2, size * 0.07)}px solid ${RED}` : "none",
          }} />
        );
      })}
    </div>
  );
}

/** Twelve positions round a circle: the scale's notes in gold with their
 *  names, the removed note as a red dashed ring, everything else a dim dot. */
function Ring({ size, pcs, removed, root }: { size: number; pcs: number[]; removed: number | null; root: number }) {
  const R = size * 0.4, c = size / 2;
  const dot = size * 0.1;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <div style={{
        position: "absolute", left: c - R, top: c - R, width: R * 2, height: R * 2,
        borderRadius: R * 2, border: `2px solid ${LINE}`, display: "flex",
      }} />
      {Array.from({ length: 12 }, (_, i) => {
        const p = (root + i) % 12;
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const on = pcs.includes(p), gone = removed === p;
        const d = on || gone ? dot : dot * 0.28;
        return (
          <div key={i} style={{
            position: "absolute", left: c + R * Math.cos(a) - d / 2, top: c + R * Math.sin(a) - d / 2,
            width: d, height: d, borderRadius: d, display: "flex", alignItems: "center", justifyContent: "center",
            background: gone ? "transparent" : on ? GOLD : "#3A3331",
            border: gone ? `${Math.max(3, dot * 0.08)}px dashed ${RED}` : "none",
            color: gone ? RED : BG, fontSize: dot * 0.42, fontWeight: 900,
          }}>{on || gone ? NAMES[p] : ""}</div>
        );
      })}
    </div>
  );
}

function Stars({ n, size }: { n: number; size: number }) {
  const pts = "50,4 61,38 97,38 68,59 79,93 50,72 21,93 32,59 3,38 39,38";
  return (
    <div style={{ display: "flex", gap: size * 0.3 }}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 100 100">
          <polygon points={pts} fill={i < n ? CREAM : "none"} stroke={i < n ? CREAM : MUTED} strokeWidth={5} />
        </svg>
      ))}
    </div>
  );
}

interface Face {
  eyebrow: string;
  title: string;
  line: string;
  footer: string;
  visual: (size: number) => ReactElement;
}

function faceFor(spec: CardSpec): Face {
  if (spec.kind === "score") {
    const stars = spec.score >= spec.total ? 3 : spec.score >= 8 ? 2 : spec.score >= 6 ? 1 : 0;
    const sub = [spec.streak >= 3 ? `best run ${spec.streak}` : "", spec.rank].filter(Boolean).join(" · ");
    return {
      eyebrow: "Hexatonic · ear training",
      title: GAME_TITLES[spec.game],
      line: spec.score === spec.total ? "A perfect set. Can you match it?" : "Can you beat it?",
      footer: "hexatonic.nathanielschool.com/ear",
      visual: (size) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.06 }}>
          <div style={{ display: "flex", alignItems: "baseline", color: CREAM, fontWeight: 900, letterSpacing: -6 }}>
            <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{spec.score}</span>
            <span style={{ fontSize: size * 0.2, color: MUTED }}>/{spec.total}</span>
          </div>
          <Stars n={stars} size={size * 0.16} />
          {sub && <div style={{ display: "flex", fontSize: size * 0.07, color: MUTED, letterSpacing: 2 }}>{sub}</div>}
        </div>
      ),
    };
  }
  if (spec.kind === "scale") {
    const face = scaleFace(spec);
    return {
      eyebrow: "Hexatonic · six-note sounds",
      title: face.name,
      line: `${face.notes.join("  ")}`,
      footer: "hexatonic.nathanielschool.com",
      visual: (size) => <Ring size={size} pcs={face.pcs} removed={face.removedPc} root={face.pcs[0] ?? 0} />,
    };
  }
  const p = PAGES[spec.page];
  return {
    eyebrow: `Hexatonic · ${p.eyebrow}`,
    title: p.title,
    line: p.line,
    footer: `hexatonic.nathanielschool.com${p.path === "/" ? "" : p.path}`,
    /* C major without its 4th: the idea of the app. */
    visual: (size) => <Ring size={size} pcs={[0, 2, 4, 7, 9, 11]} removed={5} root={0} />,
  };
}

function render(spec: CardSpec, format: CardFormat) {
  const { w, h } = FORMATS[format];
  const f = faceFor(spec);
  const tall = format !== "og";
  const pad = tall ? 88 : 72;
  const titleSize = tall ? (f.title.length > 26 ? 76 : 96) : (f.title.length > 26 ? 54 : 66);

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <Mark size={tall ? 48 : 38} />
      <div style={{ display: "flex", fontSize: tall ? 26 : 20, letterSpacing: 6, color: GOLD, textTransform: "uppercase" }}>
        {f.eyebrow}
      </div>
    </div>
  );
  const footer = (
    <div style={{ display: "flex", flexDirection: tall ? "row" : "column", justifyContent: "space-between",
                  alignItems: tall ? "center" : "flex-start", gap: tall ? 24 : 8,
                  borderTop: `2px solid ${LINE}`, paddingTop: tall ? 30 : 18, width: "100%" }}>
      <div style={{ display: "flex", fontSize: tall ? 28 : 21, color: CREAM }}>{f.footer}</div>
      <div style={{ display: "flex", fontSize: tall ? 20 : 14, letterSpacing: tall ? 4 : 3, color: MUTED }}>NATHANIEL SCHOOL OF MUSIC</div>
    </div>
  );

  if (!tall) {
    return (
      <div style={{ width: w, height: h, display: "flex", background: BG, color: CREAM, padding: pad, fontFamily: FACE }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {header}
          <div style={{ display: "flex", marginTop: 34, fontSize: titleSize, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, width: 640 }}>
            {f.title}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 28, color: "#C9C0B5", lineHeight: 1.35, width: 620 }}>{f.line}</div>
          <div style={{ display: "flex", marginTop: "auto" }}>{footer}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 400, marginLeft: 20 }}>
          {f.visual(380)}
        </div>
      </div>
    );
  }

  const visual = format === "story" ? 820 : 640;
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", background: BG, color: CREAM,
                  padding: pad, fontFamily: FACE }}>
      {header}
      <div style={{ display: "flex", marginTop: format === "story" ? 90 : 50, fontSize: titleSize, fontWeight: 900,
                    lineHeight: 1.02, letterSpacing: -3 }}>
        {f.title}
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center",
                    background: format === "story" ? SURFACE : BG, borderRadius: 48, marginTop: 40, marginBottom: 40 }}>
        {f.visual(visual)}
      </div>
      <div style={{ display: "flex", fontSize: format === "story" ? 44 : 38, lineHeight: 1.3, color: "#DDD5C9", marginBottom: 44 }}>
        {f.line}
      </div>
      {footer}
    </div>
  );
}

export async function GET(req: Request) {
  const { spec, format } = parseCard(new URL(req.url).searchParams);
  const { w, h } = FORMATS[format];
  return new ImageResponse(render(spec, format), {
    width: w, height: h, fonts: await loadFonts(),
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
  });
}
