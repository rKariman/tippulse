import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

interface MatchRowNewProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogoUrl?: string | null;
  awayTeamLogoUrl?: string | null;
  kickoffAt: string;
  previewSlug: string;
  broadcast?: string;
  linkText?: string;
}

export function MatchRowNew({
  id,
  homeTeam,
  awayTeam,
  homeTeamLogoUrl,
  awayTeamLogoUrl,
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
    <Link
      to={`/match/${previewSlug}`}
      className="block p-fluid-md hover:bg-ink-50 transition-colors"
    >
      {/* Mobile-first stacked layout that switches to row on larger screens */}
      <div className="flex flex-col gap-fluid-sm xs:flex-row xs:items-center xs:gap-fluid-md">
        {/* Teams section */}
        <div className="flex items-center gap-fluid-sm flex-1 min-w-0">
          {/* Team Logos */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <TeamLogo logoUrl={homeTeamLogoUrl} teamName={homeTeam} size="sm" />
            <TeamLogo logoUrl={awayTeamLogoUrl} teamName={awayTeam} size="sm" />
          </div>

          {/* Team Names */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="font-medium text-ink-900 truncate text-fluid-sm leading-normal">{homeTeam}</div>
            <div className="font-medium text-ink-900 truncate text-fluid-sm leading-normal">{awayTeam}</div>
          </div>
        </div>

        {/* Time, Broadcast & Link section */}
        <div className="flex items-center justify-between xs:justify-end gap-fluid-md shrink-0">
          {/* Time & Broadcast */}
          <div className="text-left xs:text-right">
            <div className="font-semibold text-ink-900 text-fluid-sm">{kickoffTime}</div>
            {broadcast && (
              <span className="text-fluid-xs text-brand-600 flex items-center gap-0.5">
                {broadcast}
                <ChevronRight size={12} />
              </span>
            )}
          </div>

          {/* Link Arrow */}
          <div className="shrink-0">
            <div className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-brand-600 transition-colors">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
