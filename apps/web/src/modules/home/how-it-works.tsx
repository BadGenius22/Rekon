"use client";

import { Target, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@rekon/ui";

const steps = [
  {
    icon: Target,
    title: "Pick a match",
    description:
      "Valorant, CS2, Dota 2, LoL — we track everything. Browse markets and find your match.",
    color: "emerald",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    iconBorder: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    icon: TrendingUp,
    title: "Predict the outcome",
    description:
      "Team A wins? Team B wins? Map handicap? Choose your prediction and see the odds.",
    color: "sky",
    gradient: "from-sky-500/20 to-sky-600/10",
    borderColor: "border-sky-500/30",
    iconBg: "bg-sky-500/20",
    iconBorder: "border-sky-500/30",
    iconColor: "text-sky-400",
  },
  {
    icon: Clock,
    title: "Trade anytime",
    description:
      "Buy or sell your position before the match ends. Cash out early or ride the wave.",
    color: "purple",
    gradient: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
    iconBg: "bg-purple-500/20",
    iconBorder: "border-purple-500/30",
    iconColor: "text-purple-400",
  },
];

export function HowItWorks() {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
          <span className="text-xl">⚡</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            How It Works
          </h2>
          <p className="text-sm text-white/50 mt-0.5">
            Start trading esports markets in three simple steps
          </p>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              className={cn(
                "group relative flex flex-col gap-5 rounded-xl p-6",
                "bg-gradient-to-br",
                step.gradient,
                "border",
                step.borderColor,
                "transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              {/* Step Number */}
              <div className="absolute top-4 right-4">
                <span className="text-4xl font-bold text-white/[0.06]">
                  0{index + 1}
                </span>
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl",
                  step.iconBg,
                  "border",
                  step.iconBorder,
                  "transition-transform duration-300 group-hover:scale-105"
                )}
              >
                <Icon className={cn("h-7 w-7", step.iconColor)} />
              </div>

              {/* Content */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {step.description}
                </p>
              </div>

              {/* Connector Arrow (not on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <div className="h-8 w-8 rounded-full bg-[#0a1220] border border-white/10 flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-white/40" />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
      >
        <a
          href="/markets"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-8 py-4",
            "bg-gradient-to-r from-emerald-500 to-cyan-500",
            "text-sm font-bold text-white",
            "shadow-lg shadow-emerald-500/20",
            "transition-all duration-300",
            "hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
          )}
        >
          <span>Start Trading Now</span>
          <ArrowRight className="h-4 w-4" />
        </a>
        <span className="text-sm text-white/40">
          No account required • Connect wallet to trade
        </span>
      </motion.div>
    </div>
  );
}
