import type { Config } from "tailwindcss";

/* Type scale. Each size carries its own leading and tracking, because neither
   is one value at every size: large display type needs negative tracking and
   tight leading, body text wants zero tracking and open leading, and small
   text a touch of positive tracking. Size, leading and tracking move together,
   so `text-5xl` on a headline is right without anyone remembering the rest. */
const fontSize: Record<string, [string, { lineHeight: string; letterSpacing: string }]> = {
  xs: ["12px", { lineHeight: "1.5", letterSpacing: "0.01em" }],
  sm: ["14px", { lineHeight: "1.55", letterSpacing: "0.003em" }],
  base: ["16px", { lineHeight: "1.6", letterSpacing: "0" }],
  lg: ["18px", { lineHeight: "1.5", letterSpacing: "-0.005em" }],
  xl: ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "2xl": ["24px", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
  "3xl": ["30px", { lineHeight: "1.12", letterSpacing: "-0.02em" }],
  "4xl": ["36px", { lineHeight: "1.06", letterSpacing: "-0.025em" }],
  "5xl": ["48px", { lineHeight: "1", letterSpacing: "-0.03em" }],
  "6xl": ["60px", { lineHeight: "0.96", letterSpacing: "-0.035em" }],
  "7xl": ["72px", { lineHeight: "0.94", letterSpacing: "-0.04em" }],
  "8xl": ["96px", { lineHeight: "0.92", letterSpacing: "-0.045em" }],
};

export default {
  content: ["./src/**/*.{ts,tsx}"],
  /* Touch screens fake :hover on the first tap and leave it stuck. With this
     on, every hover: utility only applies where a real pointer can hover. */
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      fontSize,
      colors: {
        bg: "#0A0908", surface: "#14120F", surface2: "#1D1A16",
        line: "#2A2523", "line-control": "#786963",
        red: "#E8666C", "red-hi": "#FF8A8F", "red-deep": "#8B1E24",
        gold: "#C9A227", "gold-hi": "#F3D765",
        /* Keep `muted` in step with --muted in globals.css. The utility class
           resolves from HERE, not from the custom property, so changing only the
           :root value silently leaves every `text-muted` on the old colour. */
        cream: "#F4EFE4", muted: "#A79E94", amber: "#D08A2C",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: { content: "1440px" },
    },
  },
  plugins: [],
} satisfies Config;
