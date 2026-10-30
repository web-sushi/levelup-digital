import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { LevelMark } from "@/components/brand/LevelMark";
import {
  legacyFooterDescription,
  primaryNavLinks,
  projectCta,
  verifiedContactLinks,
} from "@/lib/nav";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <div className="footer-brand-block">
          <p className="footer-logo">
            <LevelMark size={28} variant="green" decorative />
            <span className="footer-logo-text">
              <span className="footer-logo-mark">LevelUp</span>
              <span className="footer-logo-sub">Digital</span>
            </span>
          </p>
          <p className="footer-description">{legacyFooterDescription}</p>
          <Link href={projectCta.href} className="footer-cta-link focus-ring">
            {projectCta.label}
            <span aria-hidden> ↗</span>
          </Link>
        </div>

        <div className="footer-links-block">
          <p className="footer-heading">Navigate</p>
          <ul className="footer-link-list">
            {primaryNavLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="footer-link focus-ring">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/privacy" className="footer-link focus-ring">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-contact-block">
          <p className="footer-heading">Contact</p>
          <ul className="footer-contact-list">
            <li>
              <a
                href={verifiedContactLinks.email}
                className="footer-contact-item focus-ring"
              >
                <Mail className="size-4 shrink-0" aria-hidden />
                <span>Email</span>
              </a>
            </li>
            <li>
              <a
                href={verifiedContactLinks.whatsApp}
                className="footer-contact-item focus-ring"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                <span>WhatsApp</span>
              </a>
            </li>
          </ul>
          <ul className="footer-social-list" aria-label="Social media">
            <li>
              <a
                href={verifiedContactLinks.linkedIn}
                className="footer-social-text focus-ring"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </li>
            <li>
              <a
                href={verifiedContactLinks.facebook}
                className="footer-social-text focus-ring"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href={verifiedContactLinks.instagram}
                className="footer-social-text focus-ring"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="site-container footer-bottom">
        <p>© {year} LevelUp Digital. All rights reserved.</p>
      </div>
    </footer>
  );
}
