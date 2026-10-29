import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
      <p className="mt-2 text-text-muted">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-accent-secondary underline-offset-4 hover:underline"
      >
        Return home
      </Link>
    </div>
  );
}
