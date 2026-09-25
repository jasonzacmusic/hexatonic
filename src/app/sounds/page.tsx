import type { Metadata } from "next";
import SoundsClient from "./SoundsClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/sounds" },
  title: "Sounds",
  description:
    "Every six-note scale, side by side and playable in any key: major and minor with one note out, blues and major blues, whole tone and augmented, or build your own. Plus Prometheus, the Japanese pentatonics and Hijaz for reference.",
};

export default function Page() { return <SoundsClient />; }
