"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@rekon/ui";
import { SITE_CONFIG } from "@/lib/metadata";

export function CTASection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030711] via-[#0a1628] to-[#030711]" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        {/* Gradient orbs */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "relative p-8 sm:p-12 lg:p-16 rounded-3xl text-center",
            "bg-white/[0.02] border border-white/[0.05]",
            "backdrop-blur-sm",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30" />

          {/* Content */}
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4",
              "transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Ready to{" "}
            <span className="text-gradient">Trade Like a Pro?</span>
          </h2>

          <p
            className={cn(
              "text-lg text-white/60 max-w-2xl mx-auto mb-8",
              "transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Join thousands of traders on the most advanced esports prediction
            market terminal. No signup required - just connect your wallet and
            start trading.
          </p>

          {/* CTA Buttons */}
          <div
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-4",
              "transition-all duration-700 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <a
              href={`${SITE_CONFIG.appUrl}/markets`}
              className={cn(
                "group inline-flex items-center gap-2 px-8 py-4 rounded-xl",
                "bg-gradient-to-r from-cyan-500 to-cyan-400",
                "text-black font-semibold text-lg",
                "transition-all duration-300",
                "hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]",
                "hover:scale-105"
              )}
            >
              Launch App
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={SITE_CONFIG.social.discord}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 px-8 py-4 rounded-xl",
                "bg-white/5 border border-white/10",
                "text-white font-semibold text-lg",
                "transition-all duration-300",
                "hover:bg-white/10 hover:border-white/20"
              )}
            >
              Join Discord
            </a>
          </div>

          {/* Bottom text */}
          <p
            className={cn(
              "mt-8 text-sm text-white/40",
              "transition-all duration-700 delay-400",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Powered by Polymarket • Non-custodial • Instant settlements
          </p>
        </div>
      </div>
    </section>
  );
}
