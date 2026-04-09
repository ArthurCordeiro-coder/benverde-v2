import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lumii: {
          base: "#0b1f15",
          dark: "#07140e",
          accent: "#34d399",
        },
      },
    },
  },
  plugins: [],
};

export default config;
