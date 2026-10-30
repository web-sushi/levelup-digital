import { ContactChannels } from "@/components/contact/ContactChannels";
import { ContactCTA } from "@/components/contact/ContactCTA";
import { ContactHero } from "@/components/contact/ContactHero";
import { ContactProcess } from "@/components/contact/ContactProcess";
import { ContactProjectIntro } from "@/components/contact/ContactProjectIntro";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact LevelUp Digital to discuss a business website, custom web application, booking system, or digital project.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <ContactProjectIntro />
      <ContactChannels />
      <ContactProcess />
      <ContactCTA />
    </>
  );
}
