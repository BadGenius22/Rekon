"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@rekon/ui";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full",
        "border border-white/20 bg-[#121A30] text-white/80 shadow-lg",
        "transition-all duration-200 hover:border-white/40 hover:bg-[#1A2338] hover:text-white",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:ring-offset-2 focus:ring-offset-[#030711]"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

