import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hexatonic — the sounds of six notes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Six rows of six dots: six scales, six notes each, one set of shapes per
   sound. Cream dots only; gold is kept for "sounding now" in the app. */
const ROWS: [string, number[]][] = [
  ["Major (no 4)", [0, 2, 4, 7, 9, 11]],
  ["Minor (no 6)", [0, 2, 3, 5, 7, 10]],
  ["Blues", [0, 3, 5, 6, 7, 10]],
  ["Major blues", [0, 2, 3, 4, 7, 9]],
  ["Whole tone", [0, 2, 4, 6, 8, 10]],
  ["Augmented", [0, 3, 4, 7, 8, 11]],
];

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0908",
                    color: "#F4EFE4", padding: 76, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 6, color: "#C9A227" }}>
            HEXATONIC · SOUNDS
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 76,
                        fontWeight: 900, lineHeight: 0.96, letterSpacing: -2.5 }}>
            <span>Six notes.</span><span>A world</span><span>of sounds.</span>
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 18, letterSpacing: 4,
                        color: "#A79E94" }}>
            NATHANIEL SCHOOL OF MUSIC
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center",
                      marginLeft: "auto", gap: 22 }}>
          {ROWS.map(([name, semis]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", width: 190, fontSize: 22, color: "#CFC7B8" }}>{name}</div>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{ display: "flex", width: 18, height: 18, borderRadius: 9,
                  background: semis.includes(i) ? "#F4EFE4" : "#2A2523" }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ), size);
}
