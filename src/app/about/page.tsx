import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "About",
  description:
    "Meet Atsushi Junior Harada and learn about LevelUp Digital’s approach to websites and custom digital work.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About"
        description="Founder-led digital studio focused on clarity, structure, and practical outcomes."
      />

      <section className="page-section">
        <div className="site-container about-layout">
          <div className="about-portrait">
            <Image
              src="/images/portrait.jpg"
              alt="Portrait of Atsushi Junior Harada, founder of LevelUp Digital"
              width={704}
              height={1472}
              priority={false}
              sizes="(max-width: 900px) 100vw, 16rem"
            />
          </div>
          <div className="page-prose">
            <p className="about-subtitle">
              Atsushi Junior Harada — Founder · Web Developer · Family Man
            </p>
            <p>
              I help businesses and entrepreneurs build clear, structured digital
              experiences — from marketing websites to more custom applications when
              scope calls for it.
            </p>

            <h2>My journey</h2>
            <p>
              Over the past few years, I&apos;ve been building myself from the
              ground up, studying web development in phases, pausing when life
              required it, then coming back stronger. Like many people supporting a
              family, I worked full-time jobs while learning whenever time allowed.
              Progress wasn&apos;t fast, but it was consistent.
            </p>
            <p>
              Long before freelancing, I was drawn to history and coding — how things
              are built, how systems work, how structure shapes outcomes. One early
              project was a simple web application: a music quiz game that played only
              the first five seconds of a song. It wasn&apos;t perfect, but it showed
              me I enjoyed creating experiences for people.
            </p>
            <p>
              I studied civil engineering even though it wasn&apos;t the path I truly
              wanted. It shaped how I think: plan first, build with structure, keep
              foundations solid. That influences how I approach websites and
              applications today — not visuals alone, but systems designed to support
              real goals.
            </p>
            <p>
              Over time, my focus shifted toward why things work: how design affects
              decisions, how clarity builds trust, and how the right structure can
              turn visitors into real inquiries. That&apos;s where LevelUp Digital
              began.
            </p>

            <h2>How this shapes my approach</h2>
            <p>
              I start with planning and structure, not decoration. Every project is
              designed to support clear goals, guide visitors naturally, and help the
              business move forward.
            </p>
            <p>
              I believe in clarity over complexity. A site or app should make it easy
              to understand what you do and how to reach you — with thoughtful
              structure behind the surface.
            </p>

            <h2>About LevelUp Digital</h2>
            <p>
              Today I work with small businesses and online entrepreneurs on websites
              and custom digital work. I listen first, align on scope, and build what
              actually helps the business move forward — without unnecessary hype.
            </p>
            <p>
              LevelUp Digital is about steady progress, clear systems, and leveling up
              one step at a time.
            </p>
          </div>
        </div>
      </section>

      <section className="page-section page-section-surface">
        <div className="site-container">
          <h2 className="page-section-title">What I value</h2>
          <div className="page-grid-3">
            <div className="page-card">
              <h3>Clarity</h3>
              <p>
                Clear communication, straightforward processes, and interfaces that
                do not confuse visitors.
              </p>
            </div>
            <div className="page-card">
              <h3>Reliability</h3>
              <p>
                Delivering what was agreed, with steady progress and consistent quality.
              </p>
            </div>
            <div className="page-card">
              <h3>Growth</h3>
              <p>
                Continuous learning for myself and practical improvements for the
                businesses I work with.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="site-container">
          <h2 className="page-section-title">Who I work best with</h2>
          <ul className="page-prose">
            <li>Small business owners launching or improving a website</li>
            <li>Service-based businesses that rely on inquiries and bookings</li>
            <li>Clients who value clarity, communication, and steady progress</li>
            <li>
              Teams ready to invest in their online presence without unnecessary
              complexity
            </li>
          </ul>
          <Link href="/contact" className="page-link-button focus-ring">
            Start a project ↗
          </Link>
        </div>
      </section>
    </>
  );
}
