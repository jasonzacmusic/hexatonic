import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import SoundsClient from "./SoundsClient";

export const metadata: Metadata = pageMeta("/sounds", "Sounds",
  "Every six-note scale, side by side and playable in any key: major and minor with one note out, the Sunday Scale, blues and major blues, whole tone and augmented, the colour scales (Prometheus, Petrushka, Messiaen mode 5), or build your own. Plus the world scales: Hirajoshi, In sen, Iwato, Kumoi, Yo and Hijaz.", "Every six-note scale, side by side");

export default function Page() { return <SoundsClient />; }
