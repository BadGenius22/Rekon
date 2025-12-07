"use client";

import { motion } from "framer-motion";
import { cn } from "@rekon/ui";
import type { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoGridItemProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  highlight?: boolean;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-3 sm:gap-4 lg:gap-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  children,
  className,
  delay = 0,
  highlight = false,
}: BentoGridItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={cn(
        "relative rounded-xl",
        "bg-[#0a1220]/80 backdrop-blur-sm",
        "border border-white/[0.08]",
        "transition-all duration-300",
        "hover:border-white/[0.15]",
        "hover:shadow-lg hover:shadow-black/20",
        highlight && [
          "ring-1 ring-emerald-500/20",
          "bg-gradient-to-br from-[#0a1628] to-[#0a1220]",
          "hover:ring-emerald-500/30",
        ],
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-xl z-0" />
      
      {/* Glow effect for highlighted items */}
      {highlight && (
        <div className="absolute -inset-px bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0" />
      )}
      
      {/* Content - no z-index to allow children tooltips to escape */}
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}

// Animated card variant for more dramatic effects
export function BentoCard({
  children,
  className,
  delay = 0,
  glowColor = "emerald",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  glowColor?: "emerald" | "sky" | "purple" | "amber" | "red";
}) {
  const glowColors = {
    emerald: "from-emerald-500/20 via-transparent to-emerald-500/10",
    sky: "from-sky-500/20 via-transparent to-sky-500/10",
    purple: "from-purple-500/20 via-transparent to-purple-500/10",
    amber: "from-amber-500/20 via-transparent to-amber-500/10",
    red: "from-red-500/20 via-transparent to-red-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-[#0a1220]/90 backdrop-blur-md",
        "border border-white/[0.08]",
        "transition-all duration-300",
        "hover:border-white/[0.2]",
        "hover:shadow-2xl hover:shadow-black/40",
        className
      )}
    >
      {/* Animated gradient border on hover */}
      <div 
        className={cn(
          "absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          "bg-gradient-to-br",
          glowColors[glowColor]
        )} 
      />
      
      {/* Inner card */}
      <div className="relative rounded-2xl bg-[#0a1220]/95 h-full">
        {/* Subtle top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </motion.div>
  );
}

// Staggered list animation helper
export function BentoStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function BentoStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.25, 0.4, 0.25, 1],
          }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
