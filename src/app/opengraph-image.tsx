import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hexatonic — the six-note practice engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const R = 168, cx = 940, cy = 315;
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), i };
  });
  const scale = [0, 2, 4, 7, 9, 11];
  const removed = 5;
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", background: "#0A0908",
        color: "#F4EFE4", padding: 76, fontFamily: "sans-serif", position: "relative",
      }}>
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          <div style={{ display: "flex", fontSize: 21, letterSpacing: 7, color: "#C9A227" }}>
            THE SIX-NOTE PRACTICE ENGINE
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 34,
                        fontSize: 96, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3 }}>
            <span>Remove</span><span>one note.</span>
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 27, color: "#B9B0A6",
                        lineHeight: 1.35, width: 560 }}>
            The tritone goes with it — and the six remaining notes stack into one
            extended harmony.
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 19, letterSpacing: 4,
                        color: "#8A8178" }}>
            HEXATONIC · NATHANIEL SCHOOL OF MUSIC
          </div>
        </div>
        {dots.map((d) => {
          const inScale = scale.includes(d.i);
          const isRemoved = d.i === removed;
          const r = isRemoved ? 15 : inScale ? 14 : 4;
          return (
            <div key={d.i} style={{
              position: "absolute", left: d.x - r, top: d.y - r,
              width: r * 2, height: r * 2, borderRadius: r, display: "flex",
              background: isRemoved ? "transparent" : inScale ? "#C9A227" : "#3A3331",
              border: isRemoved ? "5px solid #E8666C" : "none",
            }} />
          );
        })}
        <div style={{ position: "absolute", left: cx - 44, top: cy - 52, display: "flex",
                      fontSize: 92, fontWeight: 900, color: "#C9A227" }}>6</div>
      </div>
    ),
    size
  );
}
