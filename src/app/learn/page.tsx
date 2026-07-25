import type { Metadata } from "next";
import LearnClient from "./LearnClient";

export const metadata: Metadata = {
  title: "Learn — the five theorems",
  description:
    "Why you remove the 4th or the 7th and nothing else; why the major and minor hexatonics are the same six notes; why the scale is a chord; why the harmony is tiny; and why you cannot practise it in thirds. Each with an audible proof.",
};

export default function Page() { return <LearnClient />; }
