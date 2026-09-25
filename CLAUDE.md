# Hexatonic — standing rules for Claude

Read this first, every session.

## Showing Jason the work
- Anything meant for Jason to read (guides, lesson plans, reports) is published
  as a Claude Artifact and the link is given in the reply, never left only as a
  file in the container. Guides also get a copy in `public/guides/` so they are
  served from the live site after deploy.
- Every reply that changes code says plainly whether it is **live** yet. The
  site deploys only when a change reaches `main` (Vercel Git integration). A
  pushed branch or an open PR is **not** live.

## Design standard
- The brand lives in `docs/DESIGN-BRIEF-CLAUDE-DESIGN.md`. Near-black #0A0908,
  surface #14120F, cream #F4EFE4. **Gold #C9A227 means "sounding now". Red means
  only "the removed note" — never decorative.** Archivo 900 for headlines,
  IBM Plex Mono for labels, Cormorant italic for spoken or editorial lines.
- Founder: **Jason Zac**. Never "world's first".

## Playback rule
- Changing any setting while playing must never stop the music. Tempo changes
  land on the next beat; everything else lands on the next bar or cycle. The
  sounding note and the beat count are always visible.
- New players use `useLiveDrill` / `useLiveVamp` (`src/lib/audio/useLive.ts`),
  which hand changed settings to the running scheduler. Never stop-and-restart
  on a settings change; `tests/playback-contract.test.ts` fails if you do.

## Musical claims
- Every claim the app or a class makes out loud is computed by `src/lib/theory`
  and locked by a test. Naming guardrails are in `docs/09-ROADMAP.md §7`.

## Checks before any push
- `npm run check` (typecheck, tests, build) must pass.
