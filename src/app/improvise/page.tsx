import type { Metadata } from "next";
import ImproviseClient from "./ImproviseClient";

export const metadata: Metadata = {
  title: "Improvise",
  description:
    "Improvise over six backing beds: a drone, a two-chord vamp, a four-chord loop, a suspended pad, swing and a 12-bar blues. The notes to land on light up as the chords change. Any six-note scale, any key.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/improvise" },
};

export default function Page() { return <ImproviseClient />; }
