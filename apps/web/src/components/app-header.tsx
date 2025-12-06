"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Wallet, Search } from "lucide-react";
import { Navigation } from "./navigation";
import { MobileMenu } from "./mobile-menu";
import { SearchBar } from "./search-bar";
import { SearchModal } from "./search-modal";

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
      <header className="sticky top-0 z-20 h-14 sm:h-16 border-b border-white/5 bg-[#050816]">
        <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 xl:px-8">
          {/* Logo + name */}
          <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6] shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
            <div className="flex flex-col leading-tight">
              <span className="truncate text-xs sm:text-sm font-semibold tracking-tight text-white">
                Rekon
              </span>
              <span className="hidden text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-white/50 sm:block">
                Esports Markets
              </span>
            </div>
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
            <button className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white">
              <Bell className="h-4 w-4" />
            </button>

            {/* Connect wallet - hidden on mobile, icon only on tablet, full on desktop */}
            <button className="hidden items-center gap-1.5 lg:gap-2 rounded-lg bg-[#FACC15] px-3 lg:px-4 py-2 text-xs font-semibold text-[#020617] shadow-[0_4px_12px_rgba(250,204,21,0.4)] transition-all hover:bg-[#FCD34D] hover:shadow-[0_6px_16px_rgba(250,204,21,0.5)] active:scale-[0.98] md:inline-flex">
              <Wallet className="h-4 w-4" />
              <span className="hidden lg:inline">Connect wallet</span>
            </button>

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
