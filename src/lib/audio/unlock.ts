/**
 * Getting sound out of an iPad or iPhone.
 *
 * Every browser on iOS is WebKit, and WebKit has four ways to stay silent:
 *
 * 1. The Silent switch (or Silent mode in Control Center) mutes Web Audio,
 *    because a page's Web Audio counts as "ambient" sound. Asking for the
 *    "playback" audio session (Safari 17+) fixes that. Older versions need a
 *    silent HTML <audio> element playing, which moves the page into the
 *    playback category too.
 * 2. An AudioContext only starts inside a tap. The first tap anywhere on the
 *    page creates and resumes it, synchronously, in the event handler.
 * 3. A phone call, Siri, the lock screen or a tab switch leaves the context
 *    "interrupted" or "suspended". Coming back to the tab and the next tap
 *    both resume it.
 * 4. If the context still is not running a moment after a tap, a small hint
 *    says what to check. It shows only on iPad and iPhone.
 *
 * This file knows nothing about the engine. The engine hands it a `wake`
 * (create + resume the context, start loading the piano) and a `context`.
 */

export interface ContextLike {
  state: string;
  resume?: () => Promise<void>;
  addEventListener?: (type: "statechange", fn: () => void) => void;
}

export interface UnlockHost {
  /** Create the AudioContext if needed and call resume() before returning. */
  wake: () => void;
  context: () => ContextLike | null;
}

/** iPhone, iPod, and iPad — including iPadOS, which reports itself as a Mac. */
export function isAppleTouch(ua: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return (platform === "MacIntel" || /Macintosh/.test(ua)) && maxTouchPoints > 1;
}

/** Ask for the "playback" audio session so the Silent switch does not mute us.
 *  True when the browser took it. */
export function requestPlaybackSession(nav: { audioSession?: { type: string } }): boolean {
  const session = nav.audioSession;
  if (!session) return false;
  try {
    if (session.type !== "playback") session.type = "playback";
    return session.type === "playback";
  } catch {
    return false;
  }
}

/** A fifth of a second of true silence as a WAV data URI (8 kHz, 8-bit mono,
 *  where 128 is the zero line). Built here so no file has to load first. */
export function silentWav(seconds = 0.2, rate = 8000): string {
  const n = Math.round(seconds * rate);
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, "RIFF"); v.setUint32(4, 36 + n, true); text(8, "WAVE");
  text(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  text(36, "data"); v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/** When the hint should show: only on Apple touch devices, and only when the
 *  context did not start, or when neither way round the Silent switch worked. */
export function needsHint(o: {
  ios: boolean; state: string | null; session: boolean; keeper: boolean | null;
}): boolean {
  if (!o.ios || o.state === null) return false;
  if (o.state !== "running") return true;
  return !o.session && o.keeper === false;
}

export const HINT_TEXT = "No sound? Turn off Silent mode or turn the volume up.";
const HINT_DELAY = 900;
const HINT_SHOWN_FOR = 9000;

/** The gestures WebKit accepts for starting audio. touchstart and pointerdown
 *  are NOT among them on iOS, so they are not listened to. */
export const GESTURES = ["touchend", "pointerup", "click", "keydown"] as const;

export class AudioUnlock {
  private woke = false;
  private session = false;
  private keeper: HTMLAudioElement | null = null;
  private keeperOk: boolean | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private hint: HTMLElement | null = null;
  private hintDismissed = false;
  private watched: ContextLike | null = null;

  constructor(
    private host: UnlockHost,
    private env: {
      ios: boolean;
      nav: { audioSession?: { type: string } };
      doc: Document | null;
    },
  ) {
    // Before any context exists: the session type must be set before sound starts.
    if (env.ios) this.session = requestPlaybackSession(env.nav);
  }

  /** A tap, click or key press anywhere. Runs in the capture phase, before the
   *  button's own handler, and never awaits anything. */
  onGesture = () => {
    if (!this.woke) {
      this.woke = true;
      try { this.host.wake(); } catch {}
    }
    const ctx = this.host.context();
    if (!ctx) return;
    this.watch(ctx);
    if (ctx.state !== "running") {
      try { void ctx.resume?.().catch(() => {}); } catch {}
    }
    if (this.env.ios && !this.session) this.playKeeper();
    if (this.env.ios) this.scheduleHint();
  };

  /** The tab came back (or the page was restored from the back-forward cache). */
  onVisible = () => {
    const ctx = this.host.context();
    if (ctx && ctx.state !== "running") {
      // Outside a tap iOS may refuse; the next tap resumes it for sure.
      try { void ctx.resume?.().catch(() => {}); } catch {}
    }
  };

  onHidden = () => {
    try { this.keeper?.pause(); } catch {}
  };

  get keeperPlayed() { return this.keeperOk; }
  get playbackSession() { return this.session; }

  private watch(ctx: ContextLike) {
    if (this.watched === ctx) return;
    this.watched = ctx;
    ctx.addEventListener?.("statechange", () => {
      if (ctx.state === "running" && (this.session || this.keeperOk !== false)) this.showHint(false);
    });
  }

  private playKeeper() {
    const doc = this.env.doc;
    if (!doc) return;
    if (!this.keeper) {
      const el = doc.createElement("audio");
      el.setAttribute("x-webkit-airplay", "deny");
      el.setAttribute("playsinline", "");
      el.setAttribute("aria-hidden", "true");
      el.preload = "auto";
      el.loop = true;
      el.src = silentWav();
      this.keeper = el;
    }
    const el = this.keeper;
    if (!el.paused) return;
    try {
      const p = el.play();
      if (p && typeof p.then === "function")
        p.then(() => { this.keeperOk = true; }, () => { this.keeperOk = false; });
      else this.keeperOk = true;
    } catch {
      this.keeperOk = false;
    }
  }

  private scheduleHint() {
    if (this.hintDismissed) return;
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => {
      this.hintTimer = null;
      const ctx = this.host.context();
      this.showHint(needsHint({
        ios: this.env.ios, state: ctx ? ctx.state : null,
        session: this.session, keeper: this.keeperOk,
      }));
    }, HINT_DELAY);
  }

  private showHint(show: boolean) {
    const doc = this.env.doc;
    if (!doc) return;
    if (!show) {
      if (this.hint) this.hint.dataset.show = "0";
      return;
    }
    if (!this.hint) this.hint = buildHint(doc, () => { this.hintDismissed = true; this.showHint(false); });
    this.hint.dataset.show = "1";
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.showHint(false), HINT_SHOWN_FOR);
  }
}

/** The calm little note. Plain DOM so it works on every screen without any
 *  page having to mount it. */
function buildHint(doc: Document, onClose: () => void): HTMLElement {
  if (!doc.getElementById("hx-audio-hint-style")) {
    const style = doc.createElement("style");
    style.id = "hx-audio-hint-style";
    style.textContent = `
[data-audio-hint]{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:70;
  display:flex;align-items:center;gap:6px;width:max-content;max-width:calc(100vw - 32px);box-sizing:border-box;
  padding:6px 6px 6px 16px;border:1px solid rgba(244,239,228,.16);border-radius:14px;
  background:#14120F;color:#F4EFE4;font-family:inherit;font-size:15px;font-weight:400;line-height:1.4;
  box-shadow:0 10px 30px rgba(0,0,0,.45);transform:translate(-50%,8px);opacity:0;pointer-events:none;
  transition:opacity .18s cubic-bezier(.23,1,.32,1),transform .18s cubic-bezier(.23,1,.32,1)}
[data-audio-hint][data-show="1"]{opacity:1;transform:translate(-50%,0);pointer-events:auto}
[data-audio-hint] button{flex:none;width:40px;height:40px;border:0;border-radius:10px;background:transparent;
  color:#F4EFE4;font-family:inherit;font-size:20px;line-height:1;cursor:pointer}
[data-audio-hint] button:focus-visible{outline:2px solid #F4EFE4;outline-offset:-2px}
@media (prefers-reduced-motion:reduce){[data-audio-hint]{transition:opacity .18s linear;transform:translate(-50%,0)}}`;
    doc.head.appendChild(style);
  }
  const box = doc.createElement("div");
  box.setAttribute("data-audio-hint", "");
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  box.dataset.show = "0";
  const text = doc.createElement("span");
  text.textContent = HINT_TEXT;
  const close = doc.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "×";
  close.addEventListener("click", onClose);
  box.append(text, close);
  doc.body.appendChild(box);
  return box;
}

let installed: AudioUnlock | null = null;

/** Install once per page. Safe to call from anywhere; does nothing on the server. */
export function installAudioUnlock(host: UnlockHost): AudioUnlock | null {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return installed;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  const ios = isAppleTouch(nav.userAgent ?? "", nav.platform ?? "", nav.maxTouchPoints ?? 0);
  const unlock = new AudioUnlock(host, { ios, nav, doc: document });
  for (const type of GESTURES)
    window.addEventListener(type, unlock.onGesture, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlock.onVisible();
    else unlock.onHidden();
  });
  window.addEventListener("pageshow", unlock.onVisible);
  installed = unlock;
  return unlock;
}
