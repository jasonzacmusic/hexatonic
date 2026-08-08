import type { Metadata } from "next";
import HarmonyClient from "./HarmonyClient";

export const metadata: Metadata = {
  title: "Harmony — inversion movement, triad pairs and Barry Harris",
  description:
    "Move two hexatonic triads or two octatonic diminished sevenths through every inversion, then explore triad pairs and Barry Harris's four sixth-diminished families.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/harmony" },
};

export default function Page() { return <HarmonyClient />; }
