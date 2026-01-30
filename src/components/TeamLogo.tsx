import { useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  logoUrl?: string | null;
  teamName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 md:w-9 md:h-9",
  md: "w-10 h-10 md:w-12 md:h-12",
  lg: "w-14 h-14 md:w-18 md:h-18",
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 28,
};

export function TeamLogo({ logoUrl, teamName, size = "sm", className }: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);

  const showFallback = !logoUrl || hasError;

  return (
    <div
      className={cn(
        "rounded-full bg-ink-100 flex items-center justify-center overflow-hidden shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {showFallback ? (
        <Shield className="text-ink-400" size={iconSizes[size]} />
      ) : (
        <img
          src={logoUrl}
          alt={`${teamName} logo`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain p-0.5"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
