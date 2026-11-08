import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0f13",
};

export const metadata: Metadata = {
  title: "D&D Campaign Notes | Starving Vilgeismar",
  description: "Collaborative D&D Campaign Scribe, Lore Codex & Tabletop Operations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "D&D Notes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-fantasy-900 text-slate-100 flex flex-col antialiased selection:bg-amber-600/40 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
