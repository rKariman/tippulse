import { cn } from "@/lib/utils";

interface LiveMatchBadgeProps {
  displayMinute: string;
  isLive: boolean;
  isHalfTime: boolean;
  isFinished: boolean;
  isPenalties: boolean;
  className?: string;
}

export function LiveMatchBadge({
  displayMinute,
  isLive,
  isHalfTime,
  isFinished,
  isPenalties,
  className,
}: LiveMatchBadgeProps) {
  // Determine badge style based on state
  const getBadgeStyles = () => {
    if (isLive) {
      return "bg-red-500 text-white animate-pulse";
    }
    if (isHalfTime) {
      return "bg-amber-500 text-white";
    }
    if (isPenalties) {
      return "bg-purple-500 text-white animate-pulse";
    }
    if (isFinished) {
      return "bg-ink-300 text-ink-700";
    }
    // Scheduled - just show time
    return "bg-ink-100 text-ink-600";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold min-w-[40px]",
        getBadgeStyles(),
        className
      )}
    >
      {isLive && <span className="mr-1 w-1.5 h-1.5 bg-white rounded-full" />}
      {displayMinute}
    </span>
  );
}
