import type { Metadata } from "next";
import ResolutionClient from "./ResolutionClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/resolution" },
  title: "Which bar does it land on?",
  description:
    "Play a scale in accented groups and see how many bars pass before the accent and the first note land together on beat 1. Any scale size, grouping and meter, plus a tihai builder.",
};

export default function Page() { return <ResolutionClient />; }
