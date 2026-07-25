# Can Opus build this end to end, 100%?

**Short answer: about 85% of it, unattended — and the remaining 15% is mostly
things no model should decide for you.**

Here's the honest breakdown, item by item.

---

## Green — Opus will do this fully, unattended

| piece | why it's safe |
|---|---|
| **The theory engine + tests** | Fully specified. `engine/shadava_theory.py` is a working implementation and `engine/verified.json` is the expected output. This is a port with a test oracle — the least risky kind of programming task there is. |
| **The resolution solver** | Pure arithmetic, already verified, already property-testable. |
| **Scale library data** | Generated from the engine, not hand-typed. |
| **`/resolution` calculator** | Small, self-contained, no notation. |
| **URL state, PWA, SEO/OG/JSON-LD** | Routine, and there are six precedents on this Mac. |
| **Deployment** | Standard Next.js → Vercel. One caveat below. |

## Amber — Opus will do it, but check the output yourself

| piece | the risk | how to de-risk |
|---|---|---|
| **VexFlow notation** | This is where every notation build on this Mac has gone wrong. The 10 rules are written down in the spec and there are two working reference implementations (`melakarta-sphere/components/KritiScore.tsx`, `rhythm-arithmetic/NOTATION_STANDARD.md`) — but "written down" has not historically been enough. | **Eyeball the output in C, F#, Db and Eb specifically.** Look at beams, stem directions, and whether anything crosses a barline. That's a 3-minute check that catches 90% of it. |
| **Frame-accurate audio ↔ highlight sync** | Easy to get *approximately* right and hard to get *exactly* right. Approximately right is useless on camera. | Ask for it to be verified against a screen recording, not by assertion. |
| **`/live` presenter mode** | A model can't know what reads well from a piano bench at 3 metres, or what will bite you mid-take. | You need to sit at the piano and try it once before the shoot. Non-negotiable. |
| **The teaching prose** | Opus can write it, but the voice needs to be yours. | Have it draft, then you rewrite the theorem cards in your own words. |

## Red — do not expect Opus to do these

| piece | why | who does it |
|---|---|---|
| **The naming decision** | SHADAVA vs. something plainer for a Western audience is a brand judgement about *your* audience. | **You.** |
| **The marketing claims** | Already got this wrong once at the research stage — "world's first" is false. A model will happily overclaim unless stopped. | **You**, using `docs/06-PRIOR-ART.md`. |
| **Design assets** | Thumbnail and identity. | **Claude Design** — briefs are ready in `docs/DESIGN-BRIEF-THUMBNAIL.md`. |
| **Carnatic terminology sign-off** | The konnakol syllables and gati names must be right or Indian musicians will notice instantly. Flagged as unverified in `docs/03-RHYTHM-ENGINE.md §4`. | **You**, or a Carnatic musician on the team. Do not let a model be the final authority here. |
| **The live shoot** | Obviously. | You + team. |
| **Vercel deploy auth** | The Vercel MCP connector is not authorised in this environment, so an automated deploy may fail. | May need a manual `vercel --prod`, as with Studio Command. |

---

## The one thing most likely to go wrong

**Opus building UI before the engine tests pass.** Every scale app that goes bad
goes bad by starting with the pretty part, then discovering the spelling is wrong
in F# and having to unpick it through three layers of components.

The build prompt makes M1 a hard gate — *"NOTHING VISUAL UNTIL THESE PASS."*
**If you see it reaching for React components in the first hour, stop it and point
at the build order.** That single intervention is worth more than anything else
you could do.

---

## How I'd actually run it

1. **Paste Block B to Codex first** (theory engine + tests only, no UI). Cheap,
   fast, and it either passes the truth tables or it doesn't — no ambiguity.
2. **Then paste Block A to Opus** with the engine already green. Opus now builds
   on a verified foundation instead of creating one.
3. **Check the notation in four keys** the moment M2 lands.
4. **Sit at the piano with `/live`** before you book the shoot date.

That sequence takes the risk from "will the music be right" — which is the one
risk you cannot recover from on a live stream — down to near zero, because the
music is verified before any pixel exists.

---

## Bottom line

The theory is done and proven, so the hardest and least forgiving part of this
project is already behind you. What's left is a well-specified web app with two
reference implementations to copy from. **Opus can carry that. It cannot carry the
naming, the claims, the Carnatic sign-off, or the shoot — and it shouldn't.**
