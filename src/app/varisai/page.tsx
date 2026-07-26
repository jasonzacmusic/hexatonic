import type { Metadata } from "next";
import VarisaiClient from "./VarisaiClient";

export const metadata: Metadata = {
  title: "Varisai — the practice ladder",
  description:
    "The Carnatic exercise ladder, in order and wired to the drill machine: Sarali, Melsthayi, Mandrasthayi, Janta, Dhatu and Alankaram across the sapta talas — plus raga mode, where the ascent and descent differ.",
  alternates: { canonical: "https://hexatonic.nathanielschool.com/varisai" },
};

export default function Page() { return <VarisaiClient />; }
