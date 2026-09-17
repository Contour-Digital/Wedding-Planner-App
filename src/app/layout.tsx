import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WeddingProvider } from "@/lib/wedding/WeddingProvider";

export const metadata: Metadata = {
  title: "Wedding Planner",
  description: "Collaborative wedding planning for you and your partner.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#9CAF98",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen antialiased">
        <WeddingProvider>{children}</WeddingProvider>
      </body>
    </html>
  );
}
