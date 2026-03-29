import type { ReactNode } from "react";

import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
