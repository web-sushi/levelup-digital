import type { Metadata } from "next";
import "./globals.css";

/** Google Analytics (gtag) — measurement ID G-8S5ZWSYC00. Wire in a later phase; do not duplicate scripts here. */
export const metadata: Metadata = {
  metadataBase: new URL("https://levelup-digital.dev"),
  title: {
    default: "LevelUp Digital",
    template: "%s | LevelUp Digital",
  },
  description:
    "LevelUp Digital — creative digital studio. Next.js foundation migration in progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}
