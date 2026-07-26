import type { MetadataRoute } from "next";
const SITE = "https://hexatonic.nathanielschool.com";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/practice`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/improvise`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/learn`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/varisai`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/harmony`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/scales`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/resolution`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}
