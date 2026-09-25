import type { Metadata } from "next";
import PracticeClient from "./PracticeClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/practice" },
  title: "Practice",
  description:
    "Practise six-note scales in any key over a tonic drone: runs, fourths, thirds, sequences, broken chords and doubled notes, in accent groups of 3 to 9, with live notation, a sampled piano and a bar count to the one.",
};

export default function Page() {
  return <PracticeClient />;
}
