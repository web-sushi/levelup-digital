"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { primaryNavLinks, projectCta } from "@/lib/nav";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  /* Close menu when the route changes (e.g. browser back). */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional route-change cleanup
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      close();
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, close]);

  return (
    <div className="flex items-center lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="nav-icon-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={toggle}
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <Menu className="size-6" aria-hidden />
        )}
      </button>

      <div
        id={panelId}
        ref={panelRef}
        className={`mobile-nav-panel ${open ? "mobile-nav-panel-open" : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <nav aria-label="Mobile primary">
          <ul className="flex flex-col gap-1">
            {primaryNavLinks.map(({ href, label }, index) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={href}
                    className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    tabIndex={open ? undefined : -1}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link
          href={projectCta.href}
          className="nav-cta mt-8 w-full justify-center"
          onClick={close}
        >
          {projectCta.label}
          <span aria-hidden> ↗</span>
        </Link>
      </div>
    </div>
  );
}
