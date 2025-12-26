import Link from "next/link";
import Image from "next/image";
import { cn } from "@rekon/ui";
import { RekonLogo } from "@/components/rekon-logo";

interface AppFooterProps {
  marketSlug?: string;
}

export function AppFooter({ marketSlug }: AppFooterProps = {}) {
  return (
    <footer className="border-t border-white/[0.06] bg-[#030711]">
      {/* Terminal-style top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-10 sm:py-12 md:py-14 sm:px-6 xl:px-10">
        <div className="grid gap-8 sm:gap-10 grid-cols-2 md:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-4 col-span-2 md:col-span-2">
            {/* Logo */}
            <Link href="/" className="inline-block transition-opacity hover:opacity-80">
              <RekonLogo size="lg" />
            </Link>

            <p className="text-sm leading-relaxed text-white/50 max-w-xs">
              Pro trading terminal for esports prediction markets. Real-time
              odds. Instant settlements. Powered by Polymarket.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-2 pt-2">
              <SocialLink href="https://x.com/rekongg" label="X (Twitter)">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialLink>
              <SocialLink href="" label="Discord">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </SocialLink>
              <SocialLink
                href="https://github.com/BadGenius22/Rekon"
                label="GitHub"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Markets
            </h3>
            <ul className="space-y-2.5 text-sm text-white/50">
              <FooterLink href="/markets">All Markets</FooterLink>
              <FooterLink href="/markets?game=cs2">CS2</FooterLink>
              <FooterLink href="/markets?game=lol">
                League of Legends
              </FooterLink>
              <FooterLink href="/markets?game=dota2">Dota 2</FooterLink>
              <FooterLink href="/markets?game=valorant">Valorant</FooterLink>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm text-white/50">
              <FooterLink href="/dashboard">Dashboard</FooterLink>
              <FooterLink href="/markets">Browse Markets</FooterLink>
              {marketSlug && (
                <FooterLink
                  href={`https://polymarket.com/event/${marketSlug}`}
                  external
                >
                  View on Polymarket
                </FooterLink>
              )}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2.5 text-sm text-white/50">
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/disclaimer">Risk Disclaimer</FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-8 border-t border-white/[0.04]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-xs text-white/30 font-mono">
              © {new Date().getFullYear()} REKON.GG — All rights reserved
            </div>

            {/* Powered By */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/30">Powered by</span>
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
                aria-label="Polymarket"
              >
                <Image
                  src="/polymarket-logo.svg"
                  alt="Polymarket"
                  width={90}
                  height={24}
                  className="h-5 w-auto opacity-60 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Helper Components

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "bg-white/[0.03] border border-white/[0.06]",
        "text-white/40 transition-all duration-200",
        "hover:bg-white/[0.06] hover:border-white/10 hover:text-white/70"
      )}
      aria-label={label}
    >
      {children}
    </a>
  );
}

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-white"
        >
          {children}
          <svg
            className="h-3 w-3 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link href={href} className="transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
