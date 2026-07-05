import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: "#FAF9F5",
          surface: "#F0EEE6",
          border: "rgba(20, 20, 19, 0.1)",
          secondary: "#87867F",
          dark: "#3d3d3a",
          darker: "#5e5d59",
          text: "#141413",
        },
        coral: {
          DEFAULT: "#d97757",
          hover: "#c6613f",
        },
      },
      fontFamily: {
        serif: [
          "Newsreader",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Fira Code",
          "monospace",
        ],
      },
      fontSize: {
        hero: ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.05", fontWeight: "400" }],
        h2: ["2rem", { lineHeight: "1.1", fontWeight: "500" }],
        h3: ["1.5rem", { lineHeight: "1.4", fontWeight: "400" }],
        h4: ["1.25rem", { lineHeight: "1.4", fontWeight: "400" }],
        "body-lg": ["1.125rem", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0px 2px 2px rgba(0,0,0,0.01), 0px 4px 4px rgba(0,0,0,0.02), 0px 16px 24px rgba(0,0,0,0.04)",
        "card-hover":
          "0px 4px 4px rgba(0,0,0,0.02), 0px 8px 8px rgba(0,0,0,0.03), 0px 24px 32px rgba(0,0,0,0.06)",
      },
      transitionDuration: {
        xs: "100ms",
        sm: "200ms",
        md: "300ms",
        lg: "600ms",
      },
      transitionTimingFunction: {
        anthropic: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      screens: {
        "high-contrast": { raw: "(prefers-contrast: high)" },
      },
    },
  },
  plugins: [],
};

export default config;
