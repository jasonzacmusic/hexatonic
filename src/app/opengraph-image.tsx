import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SHADAVA — the six-note practice engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const dots = [
    { x: 600, y: 300, on: true }, { x: 700, y: 358, on: true },
    { x: 700, y: 474, on: true }, { x: 600, y: 532, on: true },
    { x: 500, y: 474, on: true }, { x: 500, y: 358, on: false },
  ];
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "#0E0D0C", color: "#F4EFE4", padding: 72,
        fontFamily: "sans-serif", position: "relative",
      }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#C9A227" }}>
          ṢĀḌAVA · THE SIX-NOTE PRACTICE ENGINE
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 82,
                      fontWeight: 900, lineHeight: 1.05, maxWidth: 760 }}>
          <span>Remove one note.</span>
          <span>The tritone goes</span>
          <span>with it.</span>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 28, color: "#8A8178", maxWidth: 700 }}>
          Six-note scales in every key · Carnatic groupings · real notation, real piano
        </div>
        <div style={{ display: "flex", position: "absolute", right: 72, bottom: 64,
                      fontSize: 22, letterSpacing: 3, color: "#8A8178" }}>
          NATHANIEL SCHOOL OF MUSIC
        </div>
        {dots.map((d, i) => (
          <div key={i} style={{
            position: "absolute", left: d.x + 260, top: d.y - 60, width: 54, height: 54,
            borderRadius: 27,
            background: d.on ? "#C9A227" : "transparent",
            border: d.on ? "none" : "5px solid #8B1E24",
            display: "flex",
          }} />
        ))}
      </div>
    ),
    size
  );
}
