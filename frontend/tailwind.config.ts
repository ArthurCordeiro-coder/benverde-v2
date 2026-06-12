import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        benverde: {
          base: "#150838",
          dark: "#0c0525",
          accent: "#200a5e",
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
