import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        benverde: {
          dark: "#051009",
          base: "#0a1f12",
          light: "#133a22",
          accent: "#10b981",
        },
      },
    },
  },
  plugins: [],
};

export default config;
