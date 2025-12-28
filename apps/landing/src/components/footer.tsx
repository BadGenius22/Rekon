import Link from "next/link";
import { cn } from "@rekon/ui";
import { RekonLogo } from "./rekon-logo";
import { SITE_CONFIG } from "@/lib/metadata";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#020408]">
      {/* Terminal-style top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="mx-auto w-full max-w-screen-xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:gap-12 grid-cols-2 md:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-4 col-span-2 md:col-span-2">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-80"
            >
              <RekonLogo size="lg" />
            </Link>

            <p className="text-sm leading-relaxed text-white/50 max-w-xs">
              Professional trading terminal for esports prediction markets.
              Real-time odds. Instant settlements. Powered by Polymarket.
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
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm text-white/50">
              <FooterLink href={`${SITE_CONFIG.appUrl}/markets`}>
                Browse Markets
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/dashboard`}>
                Dashboard
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/leaderboard`}>
                Leaderboard
              </FooterLink>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Games
            </h3>
            <ul className="space-y-2.5 text-sm text-white/50">
              <FooterLink href={`${SITE_CONFIG.appUrl}/markets?game=cs2`}>
                CS2
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/markets?game=lol`}>
                League of Legends
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/markets?game=dota2`}>
                Dota 2
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/markets?game=valorant`}>
                Valorant
              </FooterLink>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2.5 text-sm text-white/50">
              <FooterLink href={`${SITE_CONFIG.appUrl}/terms`}>
                Terms of Service
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/privacy`}>
                Privacy Policy
              </FooterLink>
              <FooterLink href={`${SITE_CONFIG.appUrl}/disclaimer`}>
                Risk Disclaimer
              </FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.04]">
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
                className="text-sm font-semibold text-white/50 hover:text-white/70 transition-colors"
                aria-label="Polymarket"
              >
                Polymarket
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
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a href={href} className="transition-colors hover:text-white">
        {children}
      </a>
    </li>
  );
}
