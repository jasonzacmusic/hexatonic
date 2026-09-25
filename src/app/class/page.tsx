import type { Metadata } from "next";
import ClassClient from "./ClassClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/class" },
  title: "Class run-sheet",
  description:
    "A 90-minute hexatonic class in nine segments — theory, ear training and piano woven together — with one clock, the script for each segment, unique drills, five takeaways and a week of homework.",
};

export default function Page() { return <ClassClient />; }
