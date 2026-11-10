import Image from "next/image";

export function AboutFounder() {
  return (
    <section className="about-founder" aria-labelledby="about-founder-heading">
      <div className="site-container about-founder-grid">
        <h2 id="about-founder-heading" className="about-founder-title">
          The person behind the pixels.
        </h2>
        <div className="about-founder-portrait">
          <span className="about-founder-cobalt" aria-hidden="true" />
          <Image
            src="/images/portrait.webp"
            alt="Portrait of Atsushi Junior Harada, founder of LevelUp Digital"
            width={704}
            height={1472}
            className="about-founder-image"
            sizes="(max-width: 1023px) 92vw, 28rem"
          />
        </div>
        <div className="about-founder-copy">
          <p className="about-founder-name">
            Atsushi Junior Harada, founder, web developer, and family man
          </p>
          <p>
            I help businesses and entrepreneurs build clear, structured digital
            experiences, from marketing websites to more custom applications when
            scope calls for it.
          </p>

          <h3>My journey</h3>
          <p>
            Over the past few years, I&apos;ve been building myself from the ground
            up, studying web development in phases, pausing when life required it,
            then coming back stronger. Like many people supporting a family, I
            worked full-time jobs while learning whenever time allowed. Progress
            wasn&apos;t fast, but it was consistent.
          </p>
          <p>
            Long before freelancing, I was drawn to history and coding: how things
            are built, how systems work, how structure shapes outcomes. One early
            project was a simple web application: a music quiz game that played only
            the first five seconds of a song. It wasn&apos;t perfect, but it showed
            me I enjoyed creating experiences for people.
          </p>
          <p>
            I studied civil engineering even though it wasn&apos;t the path I truly
            wanted. It shaped how I think: plan first, build with structure, keep
            foundations solid. That influences how I approach websites and
            applications today. Not visuals alone, but systems designed to support
            real goals.
          </p>
          <p>
            Over time, my focus shifted toward why things work: how design affects
            decisions, how clarity builds trust, and how the right structure can
            turn visitors into real inquiries. That&apos;s where LevelUp Digital
            began.
          </p>

          <h3>How this shapes my approach</h3>
          <p>
            I start with planning and structure, not decoration. Every project is
            designed to support clear goals, guide visitors naturally, and help the
            business move forward.
          </p>
          <p>
            I believe in clarity over complexity. A site or app should make it easy
            to understand what you do and how to reach you, with thoughtful
            structure behind the surface.
          </p>

          <h3>About LevelUp Digital</h3>
          <p>
            Today I work with small businesses and online entrepreneurs on websites
            and custom digital work. I listen first, align on scope, and build what
            actually helps the business move forward, without unnecessary hype.
          </p>
          <p>
            LevelUp Digital is about steady progress, clear systems, and leveling up
            one step at a time.
          </p>
        </div>
      </div>
    </section>
  );
}
