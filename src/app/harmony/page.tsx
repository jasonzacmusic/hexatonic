import type { Metadata } from "next";
import HarmonyClient from "./HarmonyClient";

export const metadata: Metadata = {
  title: "Pair Atlas — exact chord covers, inversions and Barry Harris",
  description:
    "Find popular six- and eight-note collections exactly covered by two chords, practise every inversion, and explore all four Barry Harris sixth-diminished families.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/harmony" },
};

export default function Page() { return <HarmonyClient />; }
