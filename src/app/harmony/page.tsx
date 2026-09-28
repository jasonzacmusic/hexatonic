import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import HarmonyClient from "./HarmonyClient";

export const metadata: Metadata = pageMeta("/harmony", "Harmony — the chords inside six-note scales",
  "The triads and seventh chords inside any six-note scale, in any key and mode. Two-triad pairs through every inversion, and sixth–diminished harmony under every note.");

export default function Page() { return <HarmonyClient />; }
