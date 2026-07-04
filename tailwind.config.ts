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
        // Synesthesia brand: warm amber + deep purple
        brand: {
          amber: "#F5A623",
          purple: "#6B3FA0",
          dark: "#1A1525",
          surface: "#2D2340",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      // 高对比度模式下的颜色覆写
      screens: {
        "high-contrast": { raw: "(prefers-contrast: high)" },
      },
    },
  },
  plugins: [],
};

export default config;
