import { AboutCapabilities } from "@/components/about/AboutCapabilities";
import { AboutCTA } from "@/components/about/AboutCTA";
import { AboutFounder } from "@/components/about/AboutFounder";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutPhilosophy } from "@/components/about/AboutPhilosophy";
import { AboutProcess } from "@/components/about/AboutProcess";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "About",
  description:
    "Atsushi Junior Harada and LevelUp Digital, an independent studio building business websites and custom web applications.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutFounder />
      <AboutPhilosophy />
      <AboutCapabilities />
      <AboutProcess />
      <AboutCTA />
    </>
  );
}
