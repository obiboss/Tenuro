import Link from "next/link";

export function BlogFooter() {
  return (
    <footer className="mt-16 border-t border-border-soft pt-8 pb-4">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-text-muted">
          © {new Date().getFullYear()} Boldverse Services. All rights reserved.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-text-muted sm:justify-end">
          <Link href="/blog" className="transition-colors hover:text-text-strong">
            Blog
          </Link>

          <Link
            href="/receipt-generator"
            className="transition-colors hover:text-text-strong"
          >
            Receipt Generator
          </Link>

          <Link
            href="/agreement-generator"
            className="transition-colors hover:text-text-strong"
          >
            Agreement Generator
          </Link>

          <Link href="/privacy" className="transition-colors hover:text-text-strong">
            Privacy Policy
          </Link>

          <Link href="/terms" className="transition-colors hover:text-text-strong">
            Terms & Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
