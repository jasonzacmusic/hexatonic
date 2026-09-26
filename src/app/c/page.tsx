/**
 * The landing page a shared link opens. Its metadata points at the matching
 * card (src/app/card/route.tsx), so WhatsApp, X, Facebook and iMessage show
 * the score or the scale in the preview. The page itself turns the share into
 * an invitation: beat this score, or play this scale.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GAME_TITLES, PAGES, SITE, cardQuery, parseCard, scaleFace, scoreText, scaleText } from "@/lib/share";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function specOf(props: Props) {
  const raw = await props.searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") q.set(k, v);
  return parseCard(q).spec;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const spec = await specOf(props);
  const image = `${SITE}/card?${cardQuery(spec)}`;
  let title = "Hexatonic", description = PAGES.home.text;
  if (spec.kind === "score") {
    title = `${spec.score}/${spec.total} on "${GAME_TITLES[spec.game]}". Can you beat it?`;
    description = scoreText(spec.game, spec.score, spec.total, spec.streak, spec.rank);
  } else if (spec.kind === "scale") {
    const face = scaleFace(spec);
    title = `${face.name}: ${face.notes.join(" ")}`;
    description = scaleText(face);
  }
  return {
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: { title, description, url: `${SITE}/c?${cardQuery(spec)}`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedCard(props: Props) {
  const spec = await specOf(props);
  if (spec.kind === "page") redirect(PAGES[spec.page].path);

  if (spec.kind === "score") {
    const beat = `/ear?${new URLSearchParams({ game: spec.game, beat: String(spec.score), of: String(spec.total) })}`;
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-10">
        <header className="space-y-4">
          <p className="eyebrow">A challenge</p>
          <h1 className="display text-4xl sm:text-5xl">
            {spec.score}/{spec.total} on &ldquo;{GAME_TITLES[spec.game]}&rdquo;
          </h1>
          <p className="font-serif text-[23px] italic text-cream/90">
            {spec.score === spec.total ? "A perfect set. Can you match it?" : "Can you beat it?"}
          </p>
        </header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/card?${cardQuery(spec)}`} alt={`Score card: ${spec.score} out of ${spec.total}`}
             width={1200} height={630} className="w-full rounded-2xl border border-line" />
        <div className="flex flex-wrap gap-3">
          <Link href={beat} className="btn btn-primary min-h-[52px] px-8 text-[16px]">Take the challenge</Link>
          <Link href="/ear" className="btn btn-ghost min-h-[52px] px-6">See all five games</Link>
        </div>
        <p className="text-[15px] text-cream/75">
          Ten questions, about a minute. Free, in your browser, with a real piano. No sign-up.
        </p>
      </div>
    );
  }

  const face = scaleFace(spec);
  const sounds = `/sounds?${new URLSearchParams({ k: spec.key })}`;
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-10">
      <header className="space-y-4">
        <p className="eyebrow">A six-note sound</p>
        <h1 className="display text-4xl sm:text-5xl">{face.name}</h1>
        <p className="font-mono text-[22px] tracking-[0.06em] text-cream">{face.notes.join("  ")}</p>
        <p className="font-mono text-[14px] text-muted">{face.degrees}</p>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/card?${cardQuery(spec)}`} alt={`${face.name}: ${face.notes.join(" ")}`}
           width={1200} height={630} className="w-full rounded-2xl border border-line" />
      <div className="flex flex-wrap gap-3">
        <Link href={face.practice} className="btn btn-primary min-h-[52px] px-8 text-[16px]">Practise it</Link>
        <Link href={sounds} className="btn btn-ghost min-h-[52px] px-6">Hear every sound in this key</Link>
      </div>
    </div>
  );
}
