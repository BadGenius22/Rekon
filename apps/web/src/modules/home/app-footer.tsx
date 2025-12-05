import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

interface AppFooterProps {
  marketSlug?: string;
}

export function AppFooter({ marketSlug }: AppFooterProps = {}) {
  return (
    <footer className="border-t border-white/10 bg-[#050816]">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-12 md:px-6 xl:px-10">
        <div className="grid gap-8 md:grid-cols-4">
          {/* About */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">About REKON</h3>
            <p className="text-xs leading-relaxed text-white/60">
              Real-time esports prediction markets. Simple. Fast. Powered by
              Polymarket.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Links</h3>
            <ul className="space-y-2 text-xs text-white/60">
              <li>
                <Link
                  href="/markets"
                  className="transition-colors hover:text-white"
                >
                  Markets
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-white"
                >
                  Dashboard
                </Link>
              </li>
              {marketSlug && (
                <li>
                  <a
                    href={`https://polymarket.com/event/${marketSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    View on Polymarket →
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="space-y-2 text-xs text-white/60">
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Attribution */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Connect</h3>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/rekon"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                aria-label="X"
              >
                <X className="h-4 w-4" />
              </a>
              <a
                href="https://discord.gg/rekon"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                aria-label="Discord"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
            <div className="pt-4 text-xs text-white/40">
              <p className="flex items-center gap-1.5">
                Powered by{" "}
                <a
                  href="https://polymarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center transition-opacity hover:opacity-80"
                  aria-label="Polymarket"
                >
                  <Image
                    src="/polymarket-logo.svg"
                    alt="Polymarket"
                    width={80}
                    height={27}
                    className="h-5"
                  />
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/5 pt-8 text-center text-xs text-white/40">
          <p>© {new Date().getFullYear()} REKON. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
