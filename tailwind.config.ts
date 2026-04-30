import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
      },
      fontFamily: {
        sans: ["Inter", "DM Sans", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 32px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
