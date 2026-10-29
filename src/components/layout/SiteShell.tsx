import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="site-shell">
      <Header />
      <main id="main-content" className="site-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}
