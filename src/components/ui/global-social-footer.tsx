const FACEBOOK_URL = "https://web.facebook.com/profile.php?id=61560723895832";

export function GlobalSocialFooter() {
  return (
    <footer className="border-t border-border-soft bg-white px-4 py-4" aria-label="Social media">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 text-sm font-semibold text-text-muted">
        <span>Follow BOPA</span>
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="BOPA on Facebook"
          title="BOPA on Facebook"
          className="inline-flex size-11 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:bg-[#1666ce] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1877F2]/30"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
            <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.87.25-1.46 1.48-1.46H16.5V4.46A21.2 21.2 0 0 0 14.28 4C12.06 4 10.5 5.36 10.5 7.86v2.64H8v3h2.5V21h3Z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
