"use client";

/**
 * Home: the six-note idea as three sums, drawn in the board's language.
 *
 *   7 − 1 = 6   the major scale with its 4th taken out (the red seat)
 *   5 + 1 = 6   the minor pentatonic with the ♭5 added: the blues
 *   3 + 3 = 6   two triads, one circled and one arrowed: the Sunday Scale
 *
 * Every note is built by the theory library in the key the page is set to.
 */

import Link from "next/link";
import { useMemo } from "react";
import BoardRow from "@/components/BoardRow";
import { PAIR_INK } from "@/components/ScaleRing";
import { buildScale } from "@/lib/theory/scales";
import { sixNoteScales } from "@/lib/theory/pairAtlas";
import { notePretty, pc } from "@/lib/theory/note";

export default function SixEquation({ keyName }: { keyName: string }) {
  const data = useMemo(() => {
    const major = buildScale(keyName, "diatonic", 0);
    const blues = buildScale(keyName, "blues");
    const bluesAdded = blues.notes.length ? (pc(blues.notes[0]) + 6) % 12 : -1;
    const sunday = sixNoteScales(keyName).find((s) => s.id === "diatonic-3");
    const pair = sunday?.pairs[0] ?? null;
    return { major, blues, bluesAdded, pair };
  }, [keyName]);
  const { major, blues, bluesAdded, pair } = data;
  const tonic = major.notes[0] ? notePretty(major.notes[0]) : keyName;
  const q = (f: string, m?: number) => `/practice?k=${encodeURIComponent(keyName)}&f=${f}${m === undefined ? "" : `&m=${m}`}`;

  const added = blues.notes.find((n) => pc(n) === bluesAdded);

  return (
    <section aria-labelledby="six-eq-title" className="mt-10 sm:mt-12">
      <h2 id="six-eq-title" className="display text-3xl sm:text-4xl">Three ways to six notes.</h2>
      <div className="mt-5 grid gap-2.5 lg:grid-cols-3">
        <Sum a="7" op="−" b="1" href={q("diatonic", 0)} cta={`Play ${tonic} ${major.label}`}
             line={<>The {tonic} major scale with one note out. Take the 4th, <span className="text-red">{major.removed ? notePretty(major.removed) : ""}</span>, and nothing rubs against the 3rd.</>}>
          <BoardRow notes={major.notes} removed={major.removed} style="plain" />
        </Sum>
        <Sum a="5" op="+" b="1" href={q("blues")} cta={`Play ${tonic} blues`}
             line={<>The {tonic} minor pentatonic plus one note: add the ♭5, <span className="font-semibold text-[#E0894F]">{added ? notePretty(added) : ""}</span>, and it is the blues.</>}>
          <BoardRow notes={blues.notes} added={[bluesAdded]} style="plain" />
        </Sum>
        {pair && (
          <Sum a="3" op="+" b="3" href={q("diatonic", 3)} cta={`Play ${tonic} Sunday Scale`}
               line={<>Two triads that share no note:{" "}
                 <span className="font-semibold" style={{ color: PAIR_INK.a }}>{pair.shapes[0].symbol}</span> circled,{" "}
                 <span className="font-semibold" style={{ color: PAIR_INK.b }}>{pair.shapes[1].symbol}</span> arrowed. Together, the Sunday Scale.</>}>
            <BoardRow notes={pair.notes} ovals={pair.shapes[0].notes.map(pc)} arrows={pair.shapes[1].notes.map(pc)} style="plain" />
          </Sum>
        )}
      </div>
    </section>
  );
}

function Sum({ a, op, b, line, href, cta, children }: {
  a: string; op: string; b: string; line: React.ReactNode; href: string; cta: string; children: React.ReactNode;
}) {
  return (
    <article className="card flex flex-col !p-4 sm:!p-5">
      <p className="display text-[44px] leading-none tracking-[-0.03em] sm:text-[52px]" aria-label={`${a} ${op === "−" ? "minus" : "plus"} ${b} equals 6`}>
        <span>{a}</span>
        <span className={`px-2 ${op === "−" ? "text-red" : "text-[#E0894F]"}`}>{op}</span>
        <span>{b}</span>
        <span className="px-2 text-muted">=</span>
        <span className="text-cream">6</span>
      </p>
      <div className="mt-4 flex min-h-[112px] items-center">{children}</div>
      <p className="quiet mt-3 flex-1">{line}</p>
      <Link href={href} className="link-gold mt-3">{cta} →</Link>
    </article>
  );
}
