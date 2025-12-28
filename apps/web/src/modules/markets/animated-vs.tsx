"use client";

import { motion } from "framer-motion";

interface AnimatedVSProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Animated VS separator component
 * Same animation as used in MarketHero
 */
export function AnimatedVS({ size = "md", className }: AnimatedVSProps) {
  const sizeClasses = {
    sm: "text-xs sm:text-sm",
    md: "text-sm sm:text-base md:text-lg",
    lg: "text-2xl sm:text-3xl lg:text-4xl",
  };

  const blurClasses = {
    sm: "blur-sm",
    md: "blur-md",
    lg: "blur-xl",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
      className={`relative flex items-center justify-center ${className || ""}`}
    >
      <motion.div
        className={`absolute inset-0 ${blurClasses[size]} bg-white/20`}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span
        className={`relative ${sizeClasses[size]} font-black text-white/80 tracking-tighter`}
      >
        VS
      </span>
    </motion.div>
  );
}

