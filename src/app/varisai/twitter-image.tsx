import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hexatonic — the varisai practice ladder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  /* The ladder itself: six rungs, Sarali up to Alankaram. */
  const rungs = ["Sarali", "Melsthayi", "Mandrasthayi", "Janta", "Dhatu", "Alankaram"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0908",
                    color: "#F4EFE4", padding: 76, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 660 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 7, color: "#C9A227" }}>
            HEXATONIC · VARISAI
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 74,
                        fontWeight: 900, lineHeight: 0.98, letterSpacing: -2 }}>
            <span>The ladder,</span><span>in order.</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 25, color: "#B9B0A6",
                        lineHeight: 1.35, width: 600 }}>
            The Carnatic exercise sequence across the sapta talas — a curriculum, not a menu — wired to the drill machine.
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 18, letterSpacing: 4,
                        color: "#8A8178" }}>
            NATHANIEL SCHOOL OF MUSIC
          </div>
        </div>
        <div style={{ position: "absolute", right: 76, top: 90, display: "flex",
                      flexDirection: "column-reverse", gap: 16 }}>
          {rungs.map((r, i) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", width: 210 + i * 24, height: 12, borderRadius: 6,
                            background: i === 5 ? "#C9A227" : "#3A3331" }} />
              <div style={{ display: "flex", fontSize: 21, letterSpacing: 2,
                            color: i === 5 ? "#C9A227" : "#8A8178" }}>{r}</div>
            </div>
          ))}
        </div>
      </div>
    ), size);
}
