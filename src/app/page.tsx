import type { Metadata } from "next";
import { HomeClosingCta } from "@/components/home/HomeClosingCta";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSelectedWork } from "@/components/home/HomeSelectedWork";
import { HomeServicesIntro } from "@/components/home/HomeServicesIntro";
import { HomeStudioIntro } from "@/components/home/HomeStudioIntro";
import { createPageMetadata } from "@/lib/metadata";

const siteUrl = "https://levelup-digital.dev";

const title = "Websites and custom digital products";
const description =
  "LevelUp Digital helps small businesses and online entrepreneurs with conversion-focused websites, custom web applications, booking flows, and business-focused digital solutions.";

export const metadata: Metadata = {
  ...createPageMetadata({
    title,
    description,
    path: "/",
  }),
  openGraph: {
    title: `${title} | LevelUp Digital`,
    description,
    url: siteUrl,
    type: "website",
  },
};

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeServicesIntro />
      <HomeSelectedWork />
      <HomeStudioIntro />
      <HomeClosingCta />
    </>
  );
}
