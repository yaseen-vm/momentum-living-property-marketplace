import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef3f7",
          100: "#d9e6ee",
          200: "#b3cedd",
          300: "#7eadc3",
          400: "#4f8ca8",
          500: "#31708a",
          600: "#205870",
          700: "#1D3B53",
          800: "#152d3f",
          900: "#0e1f2d",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
