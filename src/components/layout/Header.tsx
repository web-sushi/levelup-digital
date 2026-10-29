import Link from "next/link";
import { MobileNav } from "@/components/layout/MobileNav";
import { PrimaryNavDesktop } from "@/components/layout/PrimaryNavDesktop";
import { projectCta } from "@/lib/nav";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-accent-line" aria-hidden />
      <div className="site-container header-inner">
        <Link href="/" className="site-logo focus-ring">
          <span className="site-logo-mark">LevelUp</span>
          <span className="site-logo-sub">Digital</span>
        </Link>

        <PrimaryNavDesktop />

        <div className="header-actions">
          <Link href={projectCta.href} className="nav-cta hidden lg:inline-flex">
            {projectCta.label}
            <span aria-hidden> ↗</span>
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
