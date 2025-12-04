"use client";

import Link from "next/link";
import { Bell, Wallet, Search } from "lucide-react";
import { Navigation } from "./navigation";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#050816]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        {/* Logo + name */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6] shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
          <div className="flex flex-col leading-tight">
            <span className="truncate text-sm font-semibold tracking-tight text-white">
              Rekon
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
              Esports Markets
            </span>
          </div>
        </Link>

        {/* Primary nav */}
        <Navigation />

        {/* Search + actions */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2.5">
          <div className="hidden max-w-[280px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0C1224]/80 px-3 py-1.5 text-xs text-white/70 shadow-[0_0_20px_rgba(15,23,42,0.8)] backdrop-blur-sm md:flex">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              placeholder="Search teams, events, markets"
              className="w-full bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
            />
            <kbd className="shrink-0 rounded bg-[#121A30] px-1.5 py-0.5 text-[10px] font-medium text-white/45">
              ⌘K
            </kbd>
          </div>

          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white">
            <Bell className="h-4 w-4" />
          </button>

          <button className="hidden items-center gap-2 rounded-lg bg-[#FACC15] px-4 py-2 text-xs font-semibold text-[#020617] shadow-[0_4px_12px_rgba(250,204,21,0.4)] transition-all hover:bg-[#FCD34D] hover:shadow-[0_6px_16px_rgba(250,204,21,0.5)] active:scale-[0.98] md:inline-flex">
            <Wallet className="h-4 w-4" />
            <span>Connect wallet</span>
          </button>
        </div>
      </div>
    </header>
  );
}
