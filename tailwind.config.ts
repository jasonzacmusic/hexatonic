import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0908", surface: "#14120F", surface2: "#1D1A16",
        line: "#2A2523", red: "#8B1E24", "red-hi": "#C4353C",
        gold: "#C9A227", "gold-hi": "#F3D765",
        cream: "#F4EFE4", muted: "#8A8178", amber: "#D08A2C",
      },
      fontFamily: {
        sans: ["Archivo", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        serif: ["Cormorant", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: { content: "1440px" },
    },
  },
  plugins: [],
} satisfies Config;
