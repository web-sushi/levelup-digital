import { ContactChannels } from "@/components/contact/ContactChannels";
import { ContactCTA } from "@/components/contact/ContactCTA";
import { ContactHero } from "@/components/contact/ContactHero";
import { ContactProcess } from "@/components/contact/ContactProcess";
import { ContactProjectIntro } from "@/components/contact/ContactProjectIntro";
import { createPageMetadata } from "@/lib/metadata";
import { portfolioReferenceFromQuery } from "@/lib/portfolio-reference";

export const metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact LevelUp Digital to discuss a business website, custom web application, booking system, or digital project.",
  path: "/contact",
});

type ContactPageProps = {
  searchParams: Promise<{ project?: string | string[] }>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const reference = portfolioReferenceFromQuery(params.project);

  return (
    <>
      <ContactHero />
      <ContactProjectIntro reference={reference} />
      <ContactChannels />
      <ContactProcess />
      <ContactCTA />
    </>
  );
}
