import type { Metadata } from "next";

export const SITE = "https://hexatonic.nathanielschool.com";

/**
 * A page's metadata, with its own title, description and link carried into
 * the share card (WhatsApp, Instagram, X, LinkedIn…). Without this every page
 * shared as the Home page. The picture comes from the page's own
 * opengraph-image file.
 */
export function pageMeta(path: string, title: string, description: string, share?: string): Metadata {
  const url = `${SITE}${path}`;
  const shareTitle = `${share ?? title} · Hexatonic`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: "Hexatonic", title: shareTitle, description, locale: "en" },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}
