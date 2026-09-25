import type { Metadata } from "next";
import HarmonyClient from "./HarmonyClient";

export const metadata: Metadata = {
  title: "Harmony — the chords inside six-note scales",
  description:
    "The triads and seventh chords inside any six-note scale, in any key and mode. Two-triad pairs through every inversion, and sixth–diminished harmony under every note.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/harmony" },
};

export default function Page() { return <HarmonyClient />; }
