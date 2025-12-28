import { cn } from "@rekon/ui";

interface RekonLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function RekonLogo({
  className,
  size = "md",
  showText = true,
}: RekonLogoProps) {
  const sizes = {
    sm: { icon: "h-5 w-5", text: "text-xs", subtext: "text-[8px]" },
    md: {
      icon: "h-6 w-6 sm:h-7 sm:w-7",
      text: "text-xs sm:text-sm",
      subtext: "text-[9px] sm:text-[10px]",
    },
    lg: { icon: "h-8 w-8", text: "text-base", subtext: "text-[10px]" },
  };

  const sizeConfig = sizes[size];

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2.5", className)}>
      {/* Logo Icon - Stylized R with glitch effect */}
      <div
        className={cn("relative flex-shrink-0", sizeConfig.icon)}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 375 375"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Red layer (offset) */}
          <g transform="translate(62.755, 263.406)">
            <path
              d="M 0 0 L 0 -64.734375 L 32.375 -64.734375 L 32.375 0 Z M 32.375 -64.734375 L 32.375 -97.109375 L 194.21875 -97.109375 L 194.21875 -64.734375 Z M 194.21875 -97.109375 L 194.21875 -129.484375 L 226.59375 -129.484375 L 226.59375 -97.109375 Z M 0 -129.484375 L 0 -161.84375 L 194.21875 -161.84375 L 194.21875 -129.484375 Z M 194.21875 0 L 194.21875 -64.734375 L 226.59375 -64.734375 L 226.59375 0 Z"
              fill="#ff0000"
              fillOpacity="0.8"
            />
          </g>
          {/* Cyan layer (offset) */}
          <g transform="translate(53.272, 263.406)">
            <path
              d="M 0 0 L 0 -64.734375 L 32.375 -64.734375 L 32.375 0 Z M 32.375 -64.734375 L 32.375 -97.109375 L 194.21875 -97.109375 L 194.21875 -64.734375 Z M 194.21875 -97.109375 L 194.21875 -129.484375 L 226.59375 -129.484375 L 226.59375 -97.109375 Z M 0 -129.484375 L 0 -161.84375 L 194.21875 -161.84375 L 194.21875 -129.484375 Z M 194.21875 0 L 194.21875 -64.734375 L 226.59375 -64.734375 L 226.59375 0 Z"
              fill="#00ffff"
              fillOpacity="0.8"
            />
          </g>
          {/* White layer (center) */}
          <g transform="translate(58.014, 263.406)">
            <path
              d="M 0 0 L 0 -64.734375 L 32.375 -64.734375 L 32.375 0 Z M 32.375 -64.734375 L 32.375 -97.109375 L 194.21875 -97.109375 L 194.21875 -64.734375 Z M 194.21875 -97.109375 L 194.21875 -129.484375 L 226.59375 -129.484375 L 226.59375 -97.109375 Z M 0 -129.484375 L 0 -161.84375 L 194.21875 -161.84375 L 194.21875 -129.484375 Z M 194.21875 0 L 194.21875 -64.734375 L 226.59375 -64.734375 L 226.59375 0 Z"
              fill="#ffffff"
            />
          </g>
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "truncate font-semibold tracking-tight text-white",
              sizeConfig.text
            )}
          >
            RekonGG
          </span>
          <span
            className={cn(
              "hidden font-medium uppercase tracking-wider text-white/50 sm:block",
              sizeConfig.subtext
            )}
          >
            Esports Markets
          </span>
        </div>
      )}
    </div>
  );
}
