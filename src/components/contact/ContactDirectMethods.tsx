import { Mail, MessageCircle } from "lucide-react";
import { verifiedContactLinks } from "@/lib/nav";

export function ContactDirectMethods() {
  return (
    <div className="contact-methods">
      <p className="contact-methods-location">Tokyo, Japan</p>
      <ul className="contact-methods-list">
        <li>
          <a
            href={verifiedContactLinks.email}
            className="contact-method-link focus-ring"
          >
            <Mail className="size-4 shrink-0" aria-hidden />
            <span>atsushijunior.harada@gmail.com</span>
          </a>
        </li>
        <li>
          <a
            href={verifiedContactLinks.whatsApp}
            className="contact-method-link focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            <span>+81 80-7431-0125 (WhatsApp)</span>
          </a>
        </li>
      </ul>
      <p className="contact-methods-social-label">Or connect here:</p>
      <ul className="contact-methods-social">
        <li>
          <a
            href={verifiedContactLinks.linkedIn}
            className="focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </li>
        <li>
          <a
            href={verifiedContactLinks.facebook}
            className="focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            Facebook
          </a>
        </li>
        <li>
          <a
            href={verifiedContactLinks.instagram}
            className="focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </li>
      </ul>
    </div>
  );
}
