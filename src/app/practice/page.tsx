import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import PracticeClient from "./PracticeClient";

export const metadata: Metadata = pageMeta("/practice", "Practice",
  "Practise six-note scales in any key over a tonic drone: runs, fourths, thirds, sequences, broken chords and doubled notes, in accent groups of 3 to 9, with live notation, a sampled piano and a bar count to the one.", "Practise six-note scales in any key");

export default function Page() {
  return <PracticeClient />;
}
