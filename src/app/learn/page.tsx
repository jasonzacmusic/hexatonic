import type { Metadata } from "next";
import LearnClient from "./LearnClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/learn" },
  title: "Why six notes: Jason Zac's hexatonic lesson, step by step",
  description:
    "Leave the 7th out of a major scale and you have the Sunday Scale: six notes that hold just two chords. Play them through every inversion, turn them into Dorian, Lydian, Phrygian and Mixolydian, accent them in 3s, 4s and 5s, and practise them in every key. Each step has a button that proves it by ear.",
};

export default function Page() { return <LearnClient />; }
