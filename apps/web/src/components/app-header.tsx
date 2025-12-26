"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Navigation } from "./navigation";
import { MobileMenu } from "./mobile-menu";
import { SearchBar } from "./search-bar";
import { SearchModal } from "./search-modal";
import { NotificationsDropdown } from "./notifications-dropdown";
import { ConnectWalletButton } from "./connect-wallet-button";
import { DemoModeBanner } from "./demo-mode-banner";
import { RekonLogo } from "./rekon-logo";

export function AppHeader() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Demo Mode Banner - appears above header when active */}
      <DemoModeBanner />

      <header className="sticky top-0 z-20 h-14 sm:h-16 border-b border-white/5 bg-[#050816]">
        <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 xl:px-8">
          {/* Logo + name */}
          <Link
            href="/"
            className="flex min-w-0 items-center shrink-0 transition-opacity hover:opacity-80"
            aria-label="Rekon - Esports Markets"
          >
            <RekonLogo size="md" />
          </Link>

          {/* Primary nav - hidden on mobile */}
          <Navigation />

          {/* Search + actions */}
          <div className="flex flex-shrink-0 items-center justify-end gap-1.5 sm:gap-2.5">
            {/* Search - hidden on mobile, visible on tablet+ */}
            <div className="hidden md:block max-w-[200px] lg:max-w-[280px]">
              <SearchBar />
            </div>

            {/* Search icon button for mobile */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white md:hidden"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notifications - hidden on very small screens */}
            <div className="hidden sm:block">
              <NotificationsDropdown />
            </div>

            {/* Connect wallet - hidden on mobile, visible on tablet+ */}
            <ConnectWalletButton />

            {/* Mobile menu button */}
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Mobile Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}
