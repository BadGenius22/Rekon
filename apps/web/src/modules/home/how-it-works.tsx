import { Target, TrendingUp, Clock } from "lucide-react";

const steps = [
  {
    icon: Target,
    title: "Pick a match",
    description:
      "Valorant, CS2, Dota 2, LoL — we track everything. Browse markets and find your match.",
  },
  {
    icon: TrendingUp,
    title: "Predict the outcome",
    description:
      "Team A wins? Team B wins? Map handicap? Choose your prediction and see the odds.",
  },
  {
    icon: Clock,
    title: "Trade anytime",
    description: "Buy/sell your position before the match ends.",
  },
];

export function HowItWorks() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">How It Works</h2>
        <p className="mt-2 text-sm text-white/60">
          Start trading esports markets in three simple steps
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#121A30] p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6]">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/40">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/70">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
