import type { MetadataRoute } from "next";
const SITE = "https://hexatonic.nathanielschool.com";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "monthly" | "yearly" = "monthly") =>
    ({ url: `${SITE}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page("", 1),
    page("/practice", 0.9),
    page("/sounds", 0.9),
    page("/improvise", 0.9),
    page("/ear", 0.8),
    page("/harmony", 0.8),
    page("/learn", 0.8),
    page("/resolution", 0.6),
    page("/about", 0.4, "yearly"),
  ];
}
