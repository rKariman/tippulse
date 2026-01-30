import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface MatchRowNewProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  previewSlug: string;
  broadcast?: string;
  linkText?: string;
}

export function MatchRowNew({
  id,
  homeTeam,
  awayTeam,
  kickoffAt,
  previewSlug,
  broadcast,
  linkText,
}: MatchRowNewProps) {
  const kickoffTime = new Date(kickoffAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-ink-50 transition-colors">
      {/* Team Logos */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-8 h-8 bg-ink-100 rounded-full flex items-center justify-center text-sm font-bold text-ink-500">
          {homeTeam.charAt(0)}
        </div>
        <div className="w-8 h-8 bg-ink-100 rounded-full flex items-center justify-center text-sm font-bold text-ink-500">
          {awayTeam.charAt(0)}
        </div>
      </div>

      {/* Team Names */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink-900 truncate">{homeTeam}</div>
        <div className="font-medium text-ink-900 truncate">{awayTeam}</div>
      </div>

      {/* Time & Broadcast */}
      <div className="text-right shrink-0">
        <div className="font-semibold text-ink-900">{kickoffTime}</div>
        {broadcast && (
          <Link
            to="#"
            className="text-sm text-brand-600 hover:text-brand-700 flex items-center justify-end gap-0.5"
          >
            {broadcast}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {/* Link */}
      <div className="shrink-0">
        {linkText ? (
          <Link
            to={`/match/${previewSlug}`}
            className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            {linkText}
            <ChevronRight size={14} />
          </Link>
        ) : (
          <Link
            to={`/match/${previewSlug}`}
            className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-brand-600 transition-colors"
          >
            <ChevronRight size={20} />
          </Link>
        )}
      </div>
    </div>
  );
}
