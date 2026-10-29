"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavLinks } from "@/lib/nav";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNavDesktop() {
  const pathname = usePathname();

  return (
    <nav
      className="primary-nav-desktop hidden lg:block"
      aria-label="Primary"
    >
      <ul className="flex items-center gap-1 xl:gap-2">
        {primaryNavLinks.map(({ href, label }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`primary-nav-link focus-ring ${active ? "primary-nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
