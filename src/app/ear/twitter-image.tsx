import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hexatonic — the ear game: which note is missing?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const R = 150, cx = 960, cy = 315;
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), i };
  });
  /* C major with the 4th silently removed — the game's opening riddle. */
  const sounding = [0, 2, 4, 7, 9, 11];
  const missing = 5;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0908",
                    color: "#F4EFE4", padding: 76, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 7, color: "#C9A227" }}>
            HEXATONIC · THE EAR GAME
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 74,
                        fontWeight: 900, lineHeight: 0.98, letterSpacing: -2 }}>
            <span>Which note</span><span>is missing?</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 25, color: "#B9B0A6",
                        lineHeight: 1.35, width: 620 }}>
            Six notes of a scale, one degree silently removed. Name the hole — score, streak, share.
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 18, letterSpacing: 4,
                        color: "#8A8178" }}>
            NATHANIEL SCHOOL OF MUSIC
          </div>
        </div>
        {dots.map((d) => {
          const on = sounding.includes(d.i), rm = d.i === missing;
          const r = on || rm ? 16 : 4;
          return <div key={d.i} style={{ position: "absolute", left: d.x - r, top: d.y - r,
            width: r * 2, height: r * 2, borderRadius: r, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 900, color: "#C9A227",
            background: rm || !on ? (rm ? "transparent" : "#3A3331") : "#C9A227",
            border: rm ? "4px dashed #C9A227" : "none" }}>{rm ? "?" : ""}</div>;
        })}
      </div>
    ), size);
}
