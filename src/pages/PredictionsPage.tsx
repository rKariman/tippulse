import { Layout } from "@/components/layout/Layout";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { DateTabs } from "@/components/widgets/DateTabs";
import { LeagueFilter } from "@/components/widgets/LeagueFilter";
import { NextUpCarousel } from "@/components/predictions/NextUpCarousel";
import { MatchRowNew } from "@/components/predictions/MatchRowNew";
import { DateFilterDebug } from "@/components/admin/DateFilterDebug";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, Trophy } from "lucide-react";
import { useUpcomingFixtures, useLeagues, useFixturesByLeague, usePreviews } from "@/hooks/useMatchData";
import { useQuery } from "@tanstack/react-query";

export default function PredictionsPage() {
  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "upcoming">("today");
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  // Fetch real data with auto-refresh for live scores
  const { data: realLeagues, isLoading: leaguesLoading } = useLeagues();
  const { data: fixtureGroups, isLoading: fixturesLoading, refetch } = useFixturesByLeague(leagueFilter, dateFilter);
  const { data: upcomingFixtures } = useUpcomingFixtures({ limit: 6, dateRange: "today" });
  const { data: previews } = usePreviews();

  // Fetch counts for all date ranges (for debug panel)
  const { data: todayGroups } = useFixturesByLeague(null, "today");
  const { data: tomorrowGroups } = useFixturesByLeague(null, "tomorrow");
  const { data: upcomingGroups } = useFixturesByLeague(null, "upcoming");

  // Calculate total counts
  const todayCount = useMemo(() => 
    todayGroups?.reduce((sum, g) => sum + g.fixtures.length, 0) ?? 0, [todayGroups]);
  const tomorrowCount = useMemo(() => 
    tomorrowGroups?.reduce((sum, g) => sum + g.fixtures.length, 0) ?? 0, [tomorrowGroups]);
  const upcomingCount = useMemo(() => 
    upcomingGroups?.reduce((sum, g) => sum + g.fixtures.length, 0) ?? 0, [upcomingGroups]);

  // Auto-refresh every 30 seconds for live scores
  useQuery({
    queryKey: ["predictions", "live-refresh"],
    queryFn: async () => {
      await refetch();
      return Date.now();
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  // Create a map of fixture IDs to preview slugs
  const previewMap = new Map<string, string>();
  if (previews) {
    previews.forEach((p) => {
      previewMap.set(p.fixture_id, p.slug);
    });
  }

  const leagues = realLeagues || [];
  const displayGroups = fixtureGroups || [];
  const nextUpFixtures = upcomingFixtures?.slice(0, 6) || [];
  const isLoading = leaguesLoading || fixturesLoading;

  return (
    <Layout>
      <div className="container py-fluid-lg">
        {/* Page header */}
        <h1 className="text-fluid-2xl font-bold text-ink-900 mb-6">Today's Football Predictions</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-fluid-lg">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-fluid-lg">
            {/* Next Up Carousel */}
            <NextUpCarousel fixtures={nextUpFixtures} previewMap={previewMap} />

            {/* Date Tabs */}
            <DateTabs selected={dateFilter} onChange={setDateFilter} />

            {/* Admin Debug Panel */}
            <DateFilterDebug
              todayCount={todayCount}
              tomorrowCount={tomorrowCount}
              upcomingCount={upcomingCount}
            />

            {/* League Filter */}
            <LeagueFilter
              leagues={leagues.map((l) => ({ id: l.id, name: l.name, slug: l.slug }))}
              selected={leagueFilter}
              onChange={setLeagueFilter}
            />

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              </div>
            )}

            {/* Fixtures by league */}
            {!isLoading &&
              displayGroups.map((group) => (
                <section key={group.league.id} className="bg-surface border border-ink-200 rounded-xl overflow-hidden">
                  {/* League Header */}
                  <div className="bg-brand-800 text-white px-fluid-md py-fluid-sm flex flex-col gap-1 xs:flex-row xs:items-center xs:justify-between">
                    <h3 className="font-semibold text-fluid-sm">{group.league.name}</h3>
                    <Link
                      to={`/predictions?league=${group.league.slug}`}
                      className="text-fluid-xs text-brand-200 hover:text-white flex items-center gap-1"
                    >
                      See All <ChevronRight size={14} />
                    </Link>
                  </div>

                  {/* Match Rows */}
                  <div className="divide-y divide-ink-100">
                    {group.fixtures.map((fixture) => (
                      <MatchRowNew
                        key={fixture.id}
                        id={fixture.id}
                        homeTeam={fixture.home_team?.name || "TBD"}
                        awayTeam={fixture.away_team?.name || "TBD"}
                        homeTeamLogoUrl={fixture.home_team?.logo_url}
                        awayTeamLogoUrl={fixture.away_team?.logo_url}
                        kickoffAt={fixture.kickoff_at}
                        previewSlug={previewMap.get(fixture.id) || fixture.slug}
                        linkText={`See All ${group.league.name} Predictions`}
                      />
                    ))}
                  </div>
                </section>
              ))}

            {/* No matches */}
            {!isLoading && displayGroups.length === 0 && (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <Trophy size={32} className="mx-auto text-ink-300 mb-3" />
                <p className="text-ink-500">
                  {dateFilter === "today" && "No matches from featured leagues today."}
                  {dateFilter === "tomorrow" && "No matches from featured leagues tomorrow."}
                  {dateFilter === "upcoming" && "No upcoming matches from featured leagues."}
                </p>
                <p className="text-sm text-ink-400 mt-1">
                  Only matches from Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Saudi Pro
                  League, and Persian Gulf Pro League are shown.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-fluid-lg">
            {/* Archived Predictions */}
            <div className="bg-surface border border-ink-200 rounded-xl overflow-hidden">
              <div className="bg-ink-800 text-white px-4 py-3 flex items-center justify-between">
                <span className="font-semibold">Archived Predictions</span>
                <button className="text-ink-300 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                    <div key={day} className="text-ink-400 py-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const isToday = i === 6;
                    return (
                      <button
                        key={i}
                        className={`py-2 rounded-lg ${
                          isToday ? "bg-brand-600 text-white font-semibold" : "text-ink-600 hover:bg-ink-100"
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
            <div className="bg-surface border border-ink-200 rounded-xl overflow-hidden">
              <div className="bg-ink-800 text-white px-4 py-3">
                <span className="font-semibold">Popular Leagues</span>
              </div>
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
