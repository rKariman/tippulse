import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownBadgeProps {
  kickoffAt: string;
  className?: string;
}

export function CountdownBadge({ kickoffAt, className }: CountdownBadgeProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const kickoff = new Date(kickoffAt).getTime();
  const diffMs = kickoff - now;

  // Already started
  if (diffMs <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-fluid-xs font-semibold bg-success-500 text-surface",
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
        LIVE
      </span>
    );
  }

  const totalMins = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  let label: string;
  if (days > 0) {
    label = `${days}d ${hours}h`;
  } else if (hours > 0) {
    label = `${hours}h ${mins}m`;
  } else {
    label = `${mins}m`;
  }

  // Urgency levels
  const isUrgent = totalMins <= 30;
  const isSoon = totalMins <= 120;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-fluid-xs font-semibold transition-colors",
        isUrgent
          ? "bg-danger-500 text-surface animate-pulse"
          : isSoon
          ? "bg-warning-500 text-ink-900"
          : "bg-ink-800 text-ink-200",
        className
      )}
    >
      <Clock size={12} className="shrink-0" />
      {label}
    </span>
  );
}
