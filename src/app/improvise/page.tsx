import type { Metadata } from "next";
import ImproviseClient from "./ImproviseClient";

export const metadata: Metadata = {
  title: "Improvise",
  description:
    "A backing band that plays chords made only from your scale: a drone, two- and four-chord loops, an open pad, swing and a 12-bar blues. The notes of the chord sounding now light up, so you know where to land. Every scale, every key, with an example to copy.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/improvise" },
};

export default function Page() { return <ImproviseClient />; }
