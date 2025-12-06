"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Menu } from "lucide-react";
import { cn } from "@rekon/ui";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/markets", label: "Markets" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={toggleMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090E1C] text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white md:hidden"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={closeMenu}
          />

          {/* Menu panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-[#050816] shadow-xl md:hidden">
            <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                onClick={closeMenu}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col p-4">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

