import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useLiveMinute, formatScore, MatchPhase } from "@/hooks/useLiveMinute";
import { LiveMatchBadge } from "./LiveMatchBadge";

export interface MatchRowProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  league: string;
  venue?: string;
  previewSlug?: string;
  // Live score fields
  homeScore?: number | null;
  awayScore?: number | null;
  phase?: MatchPhase | string | null;
  phaseStartedAt?: string | null;
  baseMinute?: number | null;
}

export function MatchRow({
  homeTeam,
  awayTeam,
  kickoffAt,
  venue,
  previewSlug,
  homeScore,
  awayScore,
  phase,
  phaseStartedAt,
  baseMinute,
}: MatchRowProps) {
  const liveStatus = useLiveMinute({
    phase: phase || 'scheduled',
    phaseStartedAt: phaseStartedAt || null,
    baseMinute: baseMinute ?? null,
    kickoffAt,
  });

  const showScore = liveStatus.isLive || liveStatus.isHalfTime || liveStatus.isFinished || liveStatus.isPenalties;

  const content = (
    <div className="flex flex-col gap-fluid-sm p-fluid-md bg-surface border border-ink-200 rounded-xl hover:shadow-lift hover:-translate-y-[1px] transition-all cursor-pointer group xs:flex-row xs:items-center xs:gap-fluid-md">
      {/* Teams and Score */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-ink-900 truncate text-fluid-sm leading-normal">{homeTeam}</span>
          {showScore && (
            <span className="font-bold text-ink-900 tabular-nums text-fluid-sm">{homeScore ?? 0}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-ink-900 truncate text-fluid-sm leading-normal">{awayTeam}</span>
          {showScore && (
            <span className="font-bold text-ink-900 tabular-nums text-fluid-sm">{awayScore ?? 0}</span>
          )}
        </div>
      </div>

      {/* Status Badge & Arrow */}
      <div className="flex items-center justify-between xs:justify-end gap-fluid-md shrink-0">
        <div className="text-center flex flex-col items-center gap-1">
          <LiveMatchBadge
            displayMinute={liveStatus.displayMinute}
            isLive={liveStatus.isLive}
            isHalfTime={liveStatus.isHalfTime}
            isFinished={liveStatus.isFinished}
            isPenalties={liveStatus.isPenalties}
          />
          {!showScore && venue && (
            <div className="text-fluid-xs text-ink-400 max-w-[120px] truncate">{venue}</div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight
          size={20}
          className="text-ink-300 group-hover:text-brand-600 transition-colors shrink-0"
        />
      </div>
    </div>
  );

  if (previewSlug) {
    return <Link to={`/match/${previewSlug}`}>{content}</Link>;
  }

  return content;
}
