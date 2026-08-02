import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hexatonic — Scale library";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const R = 150, cx = 960, cy = 315;
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), i };
  });
  const scale = [0, 2, 4, 7, 9, 11];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0908",
                    color: "#F4EFE4", padding: 76, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 7, color: "#C9A227" }}>
            HEXATONIC · SCALE LIBRARY
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 74,
                        fontWeight: 900, lineHeight: 0.98, letterSpacing: -2 }}>
            <span>Every family,</span><span>every key.</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 25, color: "#B9B0A6",
                        lineHeight: 1.35, width: 620 }}>
            Spelled the way it should be written — one letter per degree, no enharmonic shortcuts.
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 18, letterSpacing: 4,
                        color: "#A79E94" }}>
            NATHANIEL SCHOOL OF MUSIC
          </div>
        </div>
        {dots.map((d) => {
          const on = scale.includes(d.i), rm = d.i === 5;
          const r = on || rm ? 13 : 4;
          return <div key={d.i} style={{ position: "absolute", left: d.x - r, top: d.y - r,
            width: r * 2, height: r * 2, borderRadius: r, display: "flex",
            background: rm ? "transparent" : on ? "#C9A227" : "#3A3331",
            border: rm ? "5px solid #8B1E24" : "none" }} />;
        })}
      </div>
    ), size);
}
