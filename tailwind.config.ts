import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111827",
          800: "#1f2937",
          600: "#4b5563"
        }
      },
      boxShadow: {
        panel: "0 1px 3px rgb(25 31 40 / 0.04), 0 8px 24px rgb(25 31 40 / 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
