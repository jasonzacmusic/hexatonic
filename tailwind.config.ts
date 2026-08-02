import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0908", surface: "#14120F", surface2: "#1D1A16",
        line: "#2A2523", red: "#E8666C", "red-hi": "#FF8A8F", "red-deep": "#8B1E24",
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
