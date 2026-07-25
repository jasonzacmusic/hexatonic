import type { Metadata } from "next";
import ResolutionClient from "./ResolutionClient";

export const metadata: Metadata = {
  title: "Resolution calculator",
  description:
    "How many bars until a scale pattern lands back on the downbeat? Pick a scale size, subdivision, grouping and meter and find out. Works for any scale, not just six-note ones.",
};

export default function Page() { return <ResolutionClient />; }
