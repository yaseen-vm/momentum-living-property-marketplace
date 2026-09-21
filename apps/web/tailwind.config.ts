import type { Config } from "tailwindcss";

// Corporate palette (client spec §2): dark navy, white, charcoal, subtle gold.
// `primary` aliases `navy` so existing UI primitives pick up the brand colour.
const navy = {
  50: "#f1f4f9",
  100: "#dfe6f0",
  200: "#bfcde0",
  300: "#8fa7c6",
  400: "#5c7ba5",
  500: "#3b5b87",
  600: "#27446d",
  700: "#1b3356",
  800: "#132642",
  900: "#0c1a2f",
  950: "#07111f",
};

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy,
        primary: navy,
        charcoal: {
          50: "#f6f6f7",
          100: "#e8e9eb",
          200: "#d1d3d7",
          300: "#a9adb4",
          400: "#7b808a",
          500: "#5c616b",
          600: "#474b53",
          700: "#383b41",
          800: "#2a2c31",
          900: "#1d1f23",
        },
        gold: {
          50: "#fbf8f1",
          100: "#f4ecd9",
          200: "#e8d8b2",
          300: "#d9bf85",
          400: "#c9a863",
          500: "#b8924a",
          600: "#9c783b",
          700: "#7d5e31",
          800: "#5f482a",
          900: "#453522",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      maxWidth: {
        site: "1280px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(12, 26, 47, 0.04), 0 8px 24px -12px rgba(12, 26, 47, 0.12)",
        "card-hover": "0 2px 4px rgba(12, 26, 47, 0.06), 0 16px 40px -16px rgba(12, 26, 47, 0.22)",
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
    },
  },
  plugins: [],
} satisfies Config;
