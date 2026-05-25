import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./mobile.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Benverde Mobile",
  description: "Gerenciamento de dados de frutas, legumes e verduras",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#070d09",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${spaceGrotesk.variable} antialiased`} style={{ height: '100dvh', margin: 0, padding: 0, overflow: 'hidden' }}>
      {children}
    </div>
  );
}
