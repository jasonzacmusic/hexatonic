import type { Metadata } from "next";
import HarmonyClient from "./HarmonyClient";

export const metadata: Metadata = {
  title: "Harmony — triads, triad pairs and Barry Harris",
  description:
    "Every chord inside a hexatonic scale, the triad pairs that generate one, and Barry Harris's sixth-diminished movement — the four scales, done correctly, with the errors everyone else repeats called out.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/harmony" },
};

export default function Page() { return <HarmonyClient />; }
