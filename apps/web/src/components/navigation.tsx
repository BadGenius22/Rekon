"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@rekon/ui";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/markets", label: "Markets" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/activity", label: "Activity" },
    { href: "/ranks", label: "Ranks" },
    { href: "/rewards", label: "Rewards" },
  ];

  return (
    <nav className="hidden flex-1 items-center justify-center gap-6 text-xs font-medium text-white/60 md:flex">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-2 py-1.5 text-xs transition-colors",
              isActive ? "text-white" : "text-white/60 hover:text-white/90"
            )}
          >
            {item.label}
            {isActive ? (
              <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
