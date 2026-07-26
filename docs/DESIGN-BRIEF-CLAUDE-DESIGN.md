# Claude Design handoff — Hexatonic identity & visual 10x

Three assets. Do them as **three separate Claude Design projects**, in this order.
Everything you need is below. Nothing to figure out.

Live app to look at first: **https://hexatonic.nathanielschool.com**

---

---

# ⚡ START HERE — exactly what to do

**Do not attach any of these files.** Claude Design does not need them. It only
needs the live URL, which is already inside each prompt.

**Do this, three times, once per asset — but do ASSET 1 first and stop.**

1. Open Claude Design and start a **new project**.
2. Type the **Title** exactly as given below the asset heading.
3. Copy the **whole grey block** underneath it — from the first word to the last —
   and paste it as your first message. Nothing else. Do not add a hello.
4. Wait for it to finish, then click **Share → "Hand off to Claude Code"**, and
   paste the link it gives you into our chat.

**The only file worth attaching, and only to Asset 1:** the NSM logo PNG from
iCloud `Logos/` (white-on-dark version), if you want the school mark to appear in
the lockup. Everything else is in the prompt.

Do the assets in order. Asset 1 sets the identity, and Assets 2 and 3 should be
designed to match what comes back from it — so there is no point running them in
parallel.

---

# ASSET 1 — the logo and identity

## 1. Title to type into Claude Design

```
Hexatonic — Logo and Identity
```

## 2. Copy-paste prompt

```
Design the complete visual identity for HEXATONIC, a music-education web app by
Nathaniel School of Music. Look at the live app first: https://hexatonic.nathanielschool.com

WHAT THE APP IS
It teaches six-note scales. A normal major scale has seven notes; this app removes
one of them, which removes the only harsh interval in the scale, and drills what
is left. The single idea behind the whole product is SUBTRACTION — six things
present, one deliberately absent.

THE EXISTING MARK (keep the idea, improve the craft)
There is a placeholder mark already: six dots arranged in a circle, five filled
gold and one drawn as a hollow red ring. It works conceptually but it is crude.
Make it beautiful. You may reinterpret the geometry entirely as long as the idea
survives: SIX ELEMENTS, ONE OF THEM MISSING OR HOLLOW, and the absence must read
as deliberate rather than as an error or a loading state.

DELIVER
1. A primary logo lockup: the mark plus the word "Hexatonic".
2. The mark on its own, working at 512px, 128px, 32px and 16px. It MUST still read
   at 16px in a browser tab — that is the hardest constraint and the most important.
3. A horizontal lockup for the site header (about 200x40) and a stacked lockup.
4. A monochrome version (single colour, no gradients) for stamping on video,
   merchandise and dark or light backgrounds.
5. An app icon / favicon set, including a maskable version with safe padding for
   Android.
6. A one-page specification sheet: clear space, minimum sizes, what not to do.

COLOUR — this palette is load-bearing and must survive
   near-black    #0A0908   background
   surface       #14120F   raised panels
   gold          #C9A227   the primary accent; in the app it means "the note
                           sounding right now"
   gold light    #F3D765   highlights
   deep red      #8B1E24   RESERVED. In the app red means one thing only: "the
                           note that was removed". Never use red decoratively.
   cream         #F4EFE4   text
You may extend the palette, but do not reassign gold or red.

TYPE
   Display        Archivo, weight 900, tight tracking (about -0.03em)
   Editorial      Cormorant, italic, for pull quotes
   Data / labels  IBM Plex Mono, uppercase, wide tracking (about 0.16em)
Use these. Do not substitute.

MOOD
Precise, calm, scholarly, premium. The reference points are a well-designed audio
plugin and a beautifully typeset music-theory textbook — not a consumer app, not a
game, not a startup. Restrained and confident. It should look like it was made by
someone who knows music, because it was.

DO NOT
- Do not use a generic music cliché: no treble clefs, no cartoon piano keys, no
  headphones, no soundwave squiggles, no equalizer bars.
- Do not use purple-to-pink AI-startup gradients.
- Do not use glassmorphism, bevels, or drop shadows on type.
- Do not spell the name any way other than "Hexatonic".
- The founder is JASON ZAC. Never "Jason Zak", "Zach" or "Jack".

DELIVER as PNG and SVG exports plus the editable Claude Design file.
```

## 3. How to send it back to me

1. In Claude Design, open the finished project.
2. Click **Share** (top right), then **"Hand off to Claude Code"**. That copies a link.
3. Paste that link into our chat.

**Fallback:** **Share → Copy link**, and paste the URL into the chat instead.

---

# ASSET 2 — the visual 10x

## 1. Title to type into Claude Design

```
Hexatonic — Interface Art Direction
```

## 2. Copy-paste prompt

```
Take the visual design of an existing, working music app about ten times further.
The app is live and I want you to open it and use it before designing:
https://hexatonic.nathanielschool.com — look especially at /practice and /improvise.

WHAT IT DOES
It teaches six-note scales. You pick a key and a pattern; it draws real musical
notation, plays a real sampled piano, and tells you how many bars the pattern takes
to land back on the downbeat. There is also an improvise mode with backing vamps.

THE CURRENT DESIGN
Dark, warm near-black, gold accents, Archivo display type. It is competent but
plain — panels of controls stacked in rows. The signature visual is a "chromatic
ring": a twelve-position clock where the six notes in the scale are filled gold and
joined into a polygon, and the removed note is a hollow red ring in the gap it left.

WHAT I WANT FROM YOU
Make it beautiful and intentional rather than merely tidy. Specifically:

1. ART DIRECTION. Give the app a real point of view. It can be more editorial, more
   architectural, more like a fine instrument — your call. Show me something I would
   not have thought of.
2. THE RING. This is the signature element and it deserves to be a genuinely
   beautiful piece of information design. Push it. It currently shows: twelve
   positions, six filled, one hollow red, a polygon joining the six, and a glow on
   whichever note is sounding.
3. LAYOUT AND RHYTHM. Impose a real grid. Consistent spacing scale, consistent
   corner radii, consistent border weights, optical alignment. Right now some rows
   are eyeballed. This is the single biggest improvement available.
4. THE PRACTICE SCREEN. It is dense and desktop-first. Design a genuine mobile
   layout, not a reflow — decide what a phone user actually needs while sitting at
   an instrument.
5. THE NOTATION PANEL. Real music notation renders on a cream panel inside a dark
   app, and the contrast is jarring. Solve it. A dark-background stave is possible.
6. MOTION. The moment a phrase lands on the downbeat should feel like something.
   Design that moment.
7. EMPTY AND LOADING STATES. The piano samples take a beat to load on first visit.

HARD CONSTRAINTS — everything else is yours
(a) THE COLOUR SEMANTICS MUST SURVIVE.
      gold  = the note sounding right now
      red   = the note that was removed
      cream = the other notes in the scale
    Students learn this rule in ten seconds and it is the information design of the
    whole product. You may change the palette entirely, but one colour must keep
    meaning "this is the note that is gone", and one must mean "this is sounding".
(b) IT MUST BE LEGIBLE FROM THREE METRES on the /live presenter screen, which is
    used while teaching at a piano with a camera pointed at it.
(c) It must work on a phone.
(d) Do not redesign the musical notation itself. That is engraved by a notation
    engine to strict typesetting rules and is not yours to restyle beyond its
    background and frame.

TYPE (keep these)
   Display  Archivo 900, tight tracking
   Editorial Cormorant italic
   Data     IBM Plex Mono

DELIVER
1. /practice redesigned, desktop (1600x1000) and mobile (390x844).
2. /improvise redesigned, desktop and mobile.
3. /live presenter mode, desktop only, optimised for camera.
4. The chromatic ring as a component study — at least four states: idle, playing,
   the removed note, and the moment of resolution.
5. A component and token sheet: spacing scale, radii, borders, button states,
   form controls, the type scale.
6. One "hero moment" of your choosing — the single screen you would put on a
   landing page.

DO NOT
- Do not invent musical content. Do not draw fake notation, fake chord symbols or
  invented scale names. If you need musical text, copy it from the live app.
- Do not use purple-to-pink gradients, glassmorphism, or generic music clip art.
- The founder is JASON ZAC. Never "Jason Zak", "Zach" or "Jack".

DELIVER as PNG exports plus the editable Claude Design file.
```

## 3. How to send it back to me

Same as Asset 1: **Share → "Hand off to Claude Code"** → paste the link into our
chat. Fallback: **Share → Copy link**.

---

# ASSET 3 — the social and share card set

## 1. Title to type into Claude Design

```
Hexatonic — Social Share Cards
```

## 2. Copy-paste prompt

```
Design the social sharing artwork for HEXATONIC, a six-note-scale practice app by
Nathaniel School of Music. Live: https://hexatonic.nathanielschool.com

The app already generates share cards automatically, but they are plain. I want a
designed set that makes the link look considered wherever it is pasted.

THE IDEA TO CARRY
Subtraction. A normal scale has seven notes; this app removes one, and removing it
takes the only harsh interval out of the scale. Six things present, one deliberately
absent.

DELIVER
1. An Open Graph card, 1200x630, for the home page. Headline: "Remove one note."
   Subline: "The tritone goes with it." Must include the Hexatonic wordmark and,
   small, "Nathaniel School of Music".
2. Four more 1200x630 cards, same system, different headline, for:
     Practice   — "Drill it until it lands on the one."
     Improvise  — "Stop running patterns."
     Learn      — "Remove one note. Here is the proof."
     Resolution — "How many bars until it lands?"
3. A square 1080x1080 for Instagram, and a 1080x1920 story, both carrying the
   "remove one note" idea visually rather than just as text.
4. A YouTube thumbnail, 1280x720, for a lesson video about this scale. Coloured,
   not black and white. Jason Zac's face on the right third, calm expression, mouth
   closed — no shocked-face reaction thumbnails. The visual idea is a piano keyboard
   with exactly one key struck out in red.

COLOUR
   near-black #0A0908 · gold #C9A227 · gold light #F3D765
   deep red #8B1E24 (used ONLY for the removed note) · cream #F4EFE4
TYPE
   Archivo 900 for headlines · IBM Plex Mono for small caps and labels
   Cormorant italic if you want an editorial line

DO NOT
- No "world's first" or any superlative claim. It is not the first hexatonic app
  and saying so is factually wrong.
- No treble clefs, no soundwave squiggles, no headphones.
- No URL burned into the artwork.
- The founder is JASON ZAC. Never "Jason Zak", "Zach" or "Jack".

DELIVER as PNG at the exact pixel sizes listed, plus the editable file.
```

## 3. How to send it back to me

Same again: **Share → "Hand off to Claude Code"** → paste the link into our chat.
Fallback: **Share → Copy link**.

---

## Notes for me (not for Claude Design)

- The NSM logo PNGs are in iCloud under `Logos/` — use the white-on-dark version.
- When the identity comes back, the files to replace are `public/icon.svg`,
  `public/icon-192.png`, `public/icon-512.png`, `public/apple-icon.png`, and the
  inline `Mark` component in `src/components/Nav.tsx`.
- The generated share cards live in `src/app/**/opengraph-image.tsx` and
  `twitter-image.tsx`. If Claude Design delivers static artwork, those route files
  get replaced with plain image files and the metadata updated to point at them.
- The colour tokens are in `tailwind.config.ts` and `src/app/globals.css`
  (`:root`). Changing the palette means changing both.
