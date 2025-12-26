"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@rekon/ui";
import { RekonLogo } from "./rekon-logo";
import { SITE_CONFIG } from "@/lib/metadata";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-[#030711]/90 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center transition-opacity hover:opacity-80"
          aria-label="Rekon - Esports Markets"
        >
          <RekonLogo size="md" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#games"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Games
          </a>
          <a
            href="#stats"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Stats
          </a>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={SITE_CONFIG.appUrl}
            className="px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Sign In
          </a>
          <a
            href={`${SITE_CONFIG.appUrl}/markets`}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold",
              "bg-gradient-to-r from-cyan-500 to-cyan-400",
              "text-black transition-all duration-200",
              "hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]",
              "hover:scale-105"
            )}
          >
            Start Trading
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#030711]/95 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 py-6 space-y-4">
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-base font-medium text-white/70 hover:text-white"
            >
              Features
            </a>
            <a
              href="#games"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-base font-medium text-white/70 hover:text-white"
            >
              Games
            </a>
            <a
              href="#stats"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-base font-medium text-white/70 hover:text-white"
            >
              Stats
            </a>
            <div className="pt-4 border-t border-white/10 space-y-3">
              <a
                href={SITE_CONFIG.appUrl}
                className="block text-center px-4 py-2.5 text-base font-medium text-white/70 hover:text-white"
              >
                Sign In
              </a>
              <a
                href={`${SITE_CONFIG.appUrl}/markets`}
                className={cn(
                  "block text-center px-5 py-3 rounded-lg text-base font-semibold",
                  "bg-gradient-to-r from-cyan-500 to-cyan-400",
                  "text-black"
                )}
              >
                Start Trading
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
