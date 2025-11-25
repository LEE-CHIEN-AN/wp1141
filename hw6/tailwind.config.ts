import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Noto Sans TC'", "Inter", "system-ui", "sans-serif"],
        heading: ["'Noto Sans TC'", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        fairy: {
          sand: "#F9F7F0",
          cream: "#FFFDF7",
          clay: "#E9DCCD",
          mint: "#DDEDE3",
          moss: "#7FB38A",
          fern: "#4F8F6F",
          teal: "#6DB7B5",
          coral: "#F2A65A",
          amber: "#F4C979",
          sky: "#A7C4DA",
          coffee: "#4A3B33",
          cocoa: "#6B4C3B",
        },
      },
      boxShadow: {
        card: "0 15px 35px -25px rgba(74,59,51,0.45)",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        dormfairy: {
          primary: "#7FB38A",
          secondary: "#6DB7B5",
          accent: "#F2A65A",
          neutral: "#4A3B33",
          "base-100": "#F9F7F0",
          info: "#A7C4DA",
          success: "#5FA877",
          warning: "#F4C979",
          error: "#EA9085",
        },
      },
    ],
  },
} satisfies Config & { daisyui?: Record<string, unknown> };

export default config;


