import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import ImproviseClient from "./ImproviseClient";

export const metadata: Metadata = pageMeta("/improvise", "Improvise",
  "A backing band that plays chords made only from your scale: a drone, two- and four-chord loops, an open pad, swing and a 12-bar blues. The notes of the chord sounding now light up, so you know where to land. Every scale, every key, with an example to copy.", "Improvise over a band built from your scale");

export default function Page() { return <ImproviseClient />; }
