import type { Metadata } from "next";
import EarClient from "./EarClient";

export const metadata: Metadata = {
  title: "Ear — which note is missing?",
  description:
    "An ear-training game only Hexatonic can pose: six notes of a major scale with one degree silently removed. Name the hole. Ascending for beginners, scrambled for the brave — score, streak, and a shareable result.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/ear" },
};

export default function Page() { return <EarClient />; }
