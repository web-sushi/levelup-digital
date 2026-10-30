import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { SiteShell } from "@/components/layout/SiteShell";
import { SkipLink } from "@/components/layout/SkipLink";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://levelup-digital.dev"),
  title: {
    default: "LevelUp Digital",
    template: "%s | LevelUp Digital",
  },
  description:
    "LevelUp Digital is a creative digital studio for websites, custom web applications, and business-focused digital solutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen overflow-x-hidden antialiased">
        <SkipLink />
        <GoogleAnalytics />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
