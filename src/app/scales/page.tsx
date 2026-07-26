import type { Metadata } from "next";
import ScalesClient from "./ScalesClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/scales" },
  title: "Scale library",
  description:
    "Every hexatonic family in every key, correctly spelled: the diatonic hexachord and its six modes, the augmented, whole-tone, blues and Prometheus collections, plus the pentatonic and heptatonic parents.",
};

export default function Page() { return <ScalesClient />; }
