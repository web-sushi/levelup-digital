import { verifiedContactLinks } from "@/lib/nav";

const emailAddress = verifiedContactLinks.email.replace("mailto:", "");

const channels = [
  {
    label: "Email",
    value: emailAddress,
    detail: "Primary way to send a project idea.",
    href: verifiedContactLinks.email,
    external: false,
  },
  {
    label: "WhatsApp",
    value: "+81 80-7431-0125",
    detail: "A direct conversation.",
    href: verifiedContactLinks.whatsApp,
    external: true,
  },
  {
    label: "LinkedIn",
    value: "atsushi-jr-harada",
    detail: "Professional profile.",
    href: verifiedContactLinks.linkedIn,
    external: true,
  },
  {
    label: "Facebook",
    value: "atsushijr.harada",
    detail: "Facebook profile.",
    href: verifiedContactLinks.facebook,
    external: true,
  },
  {
    label: "Instagram",
    value: "atsushi.jri",
    detail: "Instagram profile.",
    href: verifiedContactLinks.instagram,
    external: true,
  },
] as const;

export function ContactChannels() {
  return (
    <section className="contact-band" aria-labelledby="contact-channels-heading">
      <div className="site-container">
        <h2 id="contact-channels-heading" className="contact-heading">
          Direct contact
        </h2>
        <p className="contact-lead">Tokyo, Japan</p>
        <ul className="contact-channels">
          {channels.map((channel) => (
            <li key={channel.label}>
              <a
                href={channel.href}
                className="contact-channel focus-ring"
                {...(channel.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <span className="contact-channel-label">{channel.label}</span>
                <span className="contact-channel-copy">
                  <span className="contact-channel-value">{channel.value}</span>
                  <span className="contact-channel-detail">{channel.detail}</span>
                </span>
                <span className="contact-channel-arrow" aria-hidden="true">
                  ↗
                </span>
                {channel.external ? (
                  <span className="sr-only"> (opens in a new tab)</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
