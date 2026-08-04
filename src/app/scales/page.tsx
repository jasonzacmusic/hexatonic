import type { Metadata } from "next";
import ScalesClient from "./ScalesClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/scales" },
  title: "Scale library",
  description:
    "Every hexatonic family in every key, correctly spelled: the diatonic hexachord and its six modes, the augmented, whole-tone, blues, Prometheus, Petrushka and Messiaen mode 5 collections, the Japanese pentatonics (hirajoshi, in sen, iwato, kumoi, yo) and Hijaz, plus the pentatonic and heptatonic parents — and an honest note on the quarter-tone maqamat and gamelan tunings that twelve-tone equal temperament cannot hold.",
};

export default function Page() { return <ScalesClient />; }
