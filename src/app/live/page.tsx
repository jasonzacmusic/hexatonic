import type { Metadata } from "next";
import LiveClient from "./LiveClient";

export const metadata: Metadata = {
  title: "Live — presenter mode",
  description: "Big type, keyboard shortcuts and preset drills for teaching from the piano bench.",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      <h1 className="sr-only">Hexatonic presenter mode</h1>
      <LiveClient />
    </>
  );
}
