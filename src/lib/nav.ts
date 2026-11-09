export const primaryNavLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const projectCta = {
  href: "/contact",
  label: "Start a Project",
} as const;

/** Public business mailbox. WhatsApp and social profiles stay as published. */
export const verifiedContactLinks = {
  email: "mailto:levelupdigital.support@gmail.com",
  whatsApp: "https://wa.me/818074310125",
  linkedIn: "https://www.linkedin.com/in/atsushi-jr-harada",
  facebook: "https://www.facebook.com/atsushijr.harada",
  instagram: "https://www.instagram.com/atsushi.jri/",
} as const;

export const legacyFooterDescription =
  "Clean, conversion-focused websites for small businesses and online entrepreneurs.";
