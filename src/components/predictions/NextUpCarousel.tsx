import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

interface NextUpFixture {
  id: string;
  slug: string;
  kickoff_at: string;
  home_team?: { name: string; logo_url?: string | null } | null;
  away_team?: { name: string; logo_url?: string | null } | null;
}

interface NextUpCarouselProps {
  fixtures: NextUpFixture[];
  previewMap: Map<string, string>;
}

export function NextUpCarousel({ fixtures, previewMap }: NextUpCarouselProps) {
  if (fixtures.length === 0) return null;

  return (
    <div className="bg-surface border border-ink-200 rounded-xl overflow-hidden">
      {/* Stacked on very small, row on larger */}
      <div className="flex flex-col xs:flex-row xs:items-stretch">
        {/* Next Up Label */}
        <div className="bg-brand-800 text-white px-fluid-md py-fluid-sm flex items-center justify-center xs:justify-start shrink-0">
          <span className="font-semibold text-fluid-sm">Next Up</span>
        </div>

        {/* Matches horizontal scroll */}
        <div className="flex-1 flex items-stretch overflow-x-auto scrollbar-hide">
          {fixtures.map((fixture, index) => {
            const kickoff = new Date(fixture.kickoff_at);
            const now = new Date();
            const diffMs = kickoff.getTime() - now.getTime();
            const diffMins = Math.max(0, Math.floor(diffMs / 60000));
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const timeUntil = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

            return (
              <Link
                key={fixture.id}
                to={`/match/${previewMap.get(fixture.id) || fixture.slug}`}
                className={`flex items-center gap-fluid-sm px-fluid-md py-fluid-sm hover:bg-ink-50 transition-colors border-b xs:border-b-0 xs:border-r border-ink-200 min-w-0 ${
                  index === 0 ? "xs:border-l border-ink-200" : ""
                }`}
              >
                {/* Team logos */}
                <div className="flex items-center gap-1 shrink-0">
                  <TeamLogo
                    logoUrl={fixture.home_team?.logo_url}
                    teamName={fixture.home_team?.name || "Home"}
                    size="sm"
                    className="w-6 h-6"
                  />
                  <TeamLogo
                    logoUrl={fixture.away_team?.logo_url}
                    teamName={fixture.away_team?.name || "Away"}
                    size="sm"
                    className="w-6 h-6"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-fluid-sm font-medium text-ink-900 truncate">
                    {fixture.home_team?.name || "TBD"} vs
                  </div>
                  <div className="text-fluid-sm font-medium text-ink-900 truncate">
                    {fixture.away_team?.name || "TBD"}
                  </div>
                </div>

                <div className="text-fluid-xs text-ink-500 whitespace-nowrap shrink-0">{timeUntil}</div>

                <ChevronRight size={16} className="text-ink-400 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
