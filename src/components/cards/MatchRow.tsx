import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface MatchRowProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  league: string;
  venue?: string;
  previewSlug?: string;
}

export function MatchRow({
  homeTeam,
  awayTeam,
  kickoffAt,
  venue,
  previewSlug,
}: MatchRowProps) {
  const kickoffTime = new Date(kickoffAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kickoffDate = new Date(kickoffAt).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const content = (
    <div className="flex items-center gap-4 p-4 bg-surface border border-ink-200 rounded-xl hover:shadow-lift hover:-translate-y-[1px] transition-all cursor-pointer group">
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink-900 truncate">{homeTeam}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-ink-900 truncate">{awayTeam}</span>
        </div>
      </div>

      {/* Time */}
      <div className="text-center shrink-0">
        <div className="text-sm font-semibold text-ink-900">{kickoffTime}</div>
        <div className="text-xs text-ink-400">{kickoffDate}</div>
        {venue && <div className="text-xs text-ink-400 mt-1">{venue}</div>}
      </div>

      {/* Arrow */}
      <ChevronRight
        size={20}
        className="text-ink-300 group-hover:text-brand-600 transition-colors shrink-0"
      />
    </div>
  );

  if (previewSlug) {
    return <Link to={`/match/${previewSlug}`}>{content}</Link>;
  }

  return content;
}
