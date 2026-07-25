import type { Metadata } from "next";
import PracticeClient from "./PracticeClient";

export const metadata: Metadata = {
  title: "Practice",
  description:
    "Drill six-note scales in any key: aroha, avaroha, in thirds, in fourths, cells of N, in groupings of 3 to 9 — with live notation, sampled piano and the bar-count it resolves on.",
};

export default function Page() {
  return (
    <>
      <h1 className="sr-only">Practice a hexatonic scale</h1>
      <PracticeClient />
    </>
  );
}
