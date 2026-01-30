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
      <div className="flex items-stretch">
        {/* Next Up Label */}
        <div className="bg-brand-800 text-white px-4 py-3 flex items-center shrink-0">
          <span className="font-semibold">Next Up</span>
        </div>

        {/* Matches horizontal scroll */}
        <div className="flex-1 flex items-stretch overflow-x-auto">
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
                className={`flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors border-r border-ink-200 ${
                  index === 0 ? "border-l border-ink-200" : ""
                }`}
              >
                {/* Team logos */}
                <div className="flex items-center gap-1">
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

                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">
                    {fixture.home_team?.name || "TBD"} vs
                  </div>
                  <div className="text-sm font-medium text-ink-900 truncate">
                    {fixture.away_team?.name || "TBD"}
                  </div>
                </div>

                <div className="text-sm text-ink-500 whitespace-nowrap">{timeUntil}</div>

                <ChevronRight size={16} className="text-ink-400 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
