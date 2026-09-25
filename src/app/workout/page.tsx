import type { Metadata } from "next";
import WorkoutClient from "./WorkoutClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/workout" },
  title: "The Workout",
  description:
    "Every road to six notes: knock one note out of the major, natural minor, harmonic minor and melodic minor scales; blues, gospel, whole tone and augmented; the same-notes-other-names list, the one-note neighbours, the harmony inside each scale, and the Barry Harris sixth-diminished lens — with a creativity dice and a 4½-hour practice plan.",
};

export default function Page() { return <WorkoutClient />; }
