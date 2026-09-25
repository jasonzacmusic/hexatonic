import type { Metadata } from "next";
import LearnClient from "./LearnClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/learn" },
  title: "Why six notes: five things you can hear",
  description:
    "Take one note out of a major scale and hear what the six left can do: the tritone disappears, major and minor share one set, the scale stacks into one chord, four chords fit, and every fourth is perfect. Each idea has a button that proves it by ear.",
};

export default function Page() { return <LearnClient />; }
