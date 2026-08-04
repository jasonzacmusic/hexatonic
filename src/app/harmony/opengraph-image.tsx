import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hexatonic — two triads that hand you the whole six-note set";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const R = 150, cx = 960, cy = 315;
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), i };
  });
  /* The triad pair that partitions the hexachord: G major gold, A minor cream. */
  const gMajor = [7, 11, 2];
  const aMinor = [9, 0, 4];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0908",
                    color: "#F4EFE4", padding: 76, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 7, color: "#C9A227" }}>
            HEXATONIC · HARMONY
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 74,
                        fontWeight: 900, lineHeight: 0.98, letterSpacing: -2 }}>
            <span>Two triads.</span><span>Six notes.</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 25, color: "#B9B0A6",
                        lineHeight: 1.35, width: 620 }}>
            Triad pairs, every chord inside the scale, and Barry Harris&apos;s sixth-diminished movement.
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 18, letterSpacing: 4,
                        color: "#8A8178" }}>
            NATHANIEL SCHOOL OF MUSIC
          </div>
        </div>
        {dots.map((d) => {
          const inG = gMajor.includes(d.i), inA = aMinor.includes(d.i);
          const r = inG || inA ? 13 : 4;
          return <div key={d.i} style={{ position: "absolute", left: d.x - r, top: d.y - r,
            width: r * 2, height: r * 2, borderRadius: r, display: "flex",
            background: inG ? "#C9A227" : inA ? "#F4EFE4" : "#3A3331" }} />;
        })}
      </div>
    ), size);
}
