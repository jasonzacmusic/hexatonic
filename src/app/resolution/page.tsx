import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import ResolutionClient from "./ResolutionClient";

export const metadata: Metadata = pageMeta("/resolution", "Which bar does it land on?",
  "Play a scale in accented groups and see how many bars pass before the accent and the first note land together on beat 1. Any scale size, grouping and meter, plus a tihai builder.", "Which bar does it land on?");

export default function Page() { return <ResolutionClient />; }
