import Image from "next/image";
import Link from "next/link";

export function HomeStudioIntro() {
  return (
    <section className="page-section" aria-labelledby="home-about-heading">
      <div className="site-container about-layout">
        <div className="about-portrait">
          <Image
            src="/images/portrait.jpg"
            alt="Portrait of Atsushi Junior Harada, founder of LevelUp Digital"
            width={704}
            height={1472}
            sizes="(max-width: 900px) 100vw, 16rem"
          />
        </div>
        <div className="page-prose">
          <h2 id="home-about-heading" className="page-section-title">
            A hands-on development studio
          </h2>
          <p className="about-subtitle">
            Atsushi Junior Harada — Founder · Web Developer
          </p>
          <p>
            I help businesses and entrepreneurs build clear, structured digital
            experiences — from marketing websites to custom applications when scope
            calls for it. Progress comes from planning first, keeping foundations
            solid, and focusing on clarity over unnecessary complexity.
          </p>
          <p>
            Whether you are launching your first site or improving an existing one,
            the approach stays the same: understand your goals, build something that
            works for real visitors, and avoid jargon-heavy process for its own sake.
          </p>
          <Link href="/about" className="page-inline-cta page-inline-cta-secondary focus-ring">
            More about us
          </Link>
        </div>
      </div>
    </section>
  );
}
