import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import EarClient from "./EarClient";

export const metadata: Metadata = pageMeta("/ear", "Ear training: modes, families, missing notes, accents",
  "Five short ear games on six-note scales. Tell major from minor, name the mode or the family, find the missing note, and hear accents in groups of 3, 4, 5 or 7. Every round sets the key first, then plays your pick and the right answer back to back.");

export default function Page() { return <EarClient />; }
