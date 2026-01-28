import { Layout } from "@/components/layout/Layout";
import { MatchRow } from "@/components/cards/MatchRow";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { DateTabs } from "@/components/widgets/DateTabs";
import { LeagueFilter } from "@/components/widgets/LeagueFilter";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, Trophy } from "lucide-react";
import { useUpcomingFixtures, useLeagues, useFixturesByLeague, usePreviews } from "@/hooks/useMatchData";

export default function PredictionsPage() {
  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "upcoming">("today");
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  // Fetch real data only
  const { data: realLeagues, isLoading: leaguesLoading } = useLeagues();
  const { data: fixtureGroups, isLoading: fixturesLoading } = useFixturesByLeague(leagueFilter);
  const { data: upcomingFixtures } = useUpcomingFixtures({ limit: 4, dateRange: dateFilter });
  const { data: previews } = usePreviews();

  // Create a map of fixture IDs to preview slugs
  const previewMap = new Map<string, string>();
  if (previews) {
    previews.forEach((p) => {
      previewMap.set(p.fixture_id, p.slug);
    });
  }

  const leagues = realLeagues || [];
  const displayGroups = fixtureGroups || [];
  const nextUpFixtures = upcomingFixtures?.slice(0, 4) || [];
  const isLoading = leaguesLoading || fixturesLoading;

  return (
    <Layout>
      <div className="container py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Today's Football Predictions</h1>
          <p className="text-ink-500 text-sm max-w-2xl">
            Expert match predictions and betting tips for all major football leagues. Click on any match to view our detailed preview and tips.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Up Carousel */}
            {nextUpFixtures.length > 0 && (
              <div className="bg-surface border border-ink-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-brand-800 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    Next Up
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {nextUpFixtures.map((fixture) => (
                    <Link
                      key={fixture.id}
                      to={`/match/${previewMap.get(fixture.id) || fixture.slug}`}
                      className="shrink-0 w-40 p-3 bg-ink-50 rounded-lg hover:bg-ink-100 transition-colors"
                    >
                      <div className="text-xs text-ink-400 mb-1">
                        {new Date(fixture.kickoff_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Rome",
                        })}
                      </div>
                      <div className="text-sm font-medium text-ink-900 truncate">
                        {fixture.home_team?.name || "TBD"}
                      </div>
                      <div className="text-sm font-medium text-ink-900 truncate">
                        {fixture.away_team?.name || "TBD"}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="space-y-4">
              <DateTabs selected={dateFilter} onChange={setDateFilter} />
              <LeagueFilter
                leagues={leagues.map(l => ({ id: l.id, name: l.name, slug: l.slug }))}
                selected={leagueFilter}
                onChange={setLeagueFilter}
              />
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              </div>
            )}

            {/* Fixtures by league */}
            {!isLoading && displayGroups.map((group) => (
              <section key={group.league.id}>
                <div className="bg-brand-800 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
                  <h3 className="font-semibold">{group.league.name}</h3>
                  <Link
                    to={`/predictions?league=${group.league.slug}`}
                    className="text-sm text-brand-200 hover:text-white flex items-center gap-1"
                  >
                    See All <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="bg-surface border border-t-0 border-ink-200 rounded-b-xl divide-y divide-ink-100">
                  {group.fixtures.map((fixture) => (
                    <div key={fixture.id} className="p-0">
                      <MatchRow
                        id={fixture.id}
                        homeTeam={fixture.home_team?.name || "TBD"}
                        awayTeam={fixture.away_team?.name || "TBD"}
                        kickoffAt={fixture.kickoff_at}
                        league={group.league.name}
                        venue={fixture.venue}
                        previewSlug={previewMap.get(fixture.id) || fixture.slug}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* No matches */}
            {!isLoading && displayGroups.length === 0 && (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <Trophy size={32} className="mx-auto text-ink-300 mb-3" />
                <p className="text-ink-500">No matches found for today.</p>
                <p className="text-sm text-ink-400 mt-1">Run sync from /admin/sync to fetch matches.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Archived Predictions */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Archived Predictions</div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="text-ink-400 py-1">{day}</div>
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const isToday = i === 6;
                    return (
                      <button
                        key={i}
                        className={`py-2 rounded-lg ${
                          isToday
                            ? "bg-brand-600 text-white font-semibold"
                            : "text-ink-600 hover:bg-ink-100"
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <NewsletterWidget />

            {/* Popular Leagues */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Popular Leagues</div>
              <div className="p-4 space-y-2">
                {leagues.length === 0 ? (
                  <p className="text-center text-ink-500 text-sm py-4">No leagues available</p>
                ) : (
                  leagues.slice(0, 8).map((league) => (
                    <button
                      key={league.id}
                      onClick={() => setLeagueFilter(leagueFilter === league.slug ? null : league.slug)}
                      className={`block w-full text-left py-2 px-3 text-sm rounded-lg transition-colors ${
                        leagueFilter === league.slug
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-ink-700 hover:bg-ink-50"
                      }`}
                    >
                      {league.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
