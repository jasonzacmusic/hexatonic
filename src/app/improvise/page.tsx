import type { Metadata } from "next";
import ImproviseClient from "./ImproviseClient";

export const metadata: Metadata = {
  title: "Improvise",
  description:
    "Improvise over a vamp built only from the hexatonic scale's own harmony. Drones, two-chord vamps, quartal beds and a 6/8 feel, with guide tones showing what to land on. Real piano, any key, any mode.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/improvise" },
};

export default function Page() { return <ImproviseClient />; }
