import type { Metadata } from "next";
import SoundsClient from "./SoundsClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/sounds" },
  title: "Sounds",
  description:
    "Every six-note scale, side by side and playable in any key: major and minor with one note out, the Sunday Scale, blues and major blues, whole tone and augmented, the colour scales (Prometheus, Petrushka, Messiaen mode 5), or build your own. Plus the world scales: Hirajoshi, In sen, Iwato, Kumoi, Yo and Hijaz.",
};

export default function Page() { return <SoundsClient />; }
