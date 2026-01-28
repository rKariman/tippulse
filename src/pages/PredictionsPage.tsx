import { Layout } from "@/components/layout/Layout";
import { MatchRow } from "@/components/cards/MatchRow";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { DateTabs } from "@/components/widgets/DateTabs";
import { LeagueFilter } from "@/components/widgets/LeagueFilter";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { mockFixtures, mockLeagues, mockPreviews } from "@/lib/mockData";

export default function PredictionsPage() {
  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "upcoming">("today");
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  // Group fixtures by league
  const filteredFixtures = mockFixtures.filter((fixture) => {
    if (leagueFilter && fixture.league.slug !== leagueFilter) return false;
    return true;
  });

  const fixturesByLeague = filteredFixtures.reduce((acc, fixture) => {
    const leagueName = fixture.league.name;
    if (!acc[leagueName]) {
      acc[leagueName] = [];
    }
    acc[leagueName].push(fixture);
    return acc;
  }, {} as Record<string, typeof mockFixtures>);

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
            <div className="bg-surface border border-ink-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-brand-800 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                  Next Up
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {mockFixtures.slice(0, 4).map((fixture) => (
                  <Link
                    key={fixture.id}
                    to={`/match/${mockPreviews.find((p) => p.fixture.id === fixture.id)?.slug || fixture.slug}`}
                    className="shrink-0 w-40 p-3 bg-ink-50 rounded-lg hover:bg-ink-100 transition-colors"
                  >
                    <div className="text-xs text-ink-400 mb-1">
                      {new Date(fixture.kickoffAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-sm font-medium text-ink-900 truncate">
                      {fixture.homeTeam.name}
                    </div>
                    <div className="text-sm font-medium text-ink-900 truncate">
                      {fixture.awayTeam.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <DateTabs selected={dateFilter} onChange={setDateFilter} />
              <LeagueFilter
                leagues={mockLeagues}
                selected={leagueFilter}
                onChange={setLeagueFilter}
              />
            </div>

            {/* Fixtures by league */}
            {Object.entries(fixturesByLeague).map(([leagueName, fixtures]) => (
              <section key={leagueName}>
                <div className="bg-brand-800 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
                  <h3 className="font-semibold">{leagueName}</h3>
                  <Link
                    to={`/predictions?league=${fixtures[0].league.slug}`}
                    className="text-sm text-brand-200 hover:text-white flex items-center gap-1"
                  >
                    See All <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="bg-surface border border-t-0 border-ink-200 rounded-b-xl divide-y divide-ink-100">
                  {fixtures.map((fixture) => (
                    <div key={fixture.id} className="p-0">
                      <MatchRow
                        id={fixture.id}
                        homeTeam={fixture.homeTeam.name}
                        awayTeam={fixture.awayTeam.name}
                        kickoffAt={fixture.kickoffAt}
                        league={fixture.league.name}
                        venue={fixture.venue}
                        previewSlug={mockPreviews.find((p) => p.fixture.id === fixture.id)?.slug}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {Object.keys(fixturesByLeague).length === 0 && (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">No matches available for this selection.</p>
                <p className="text-sm text-ink-400 mt-1">Try changing the filters or check back later.</p>
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
                {mockLeagues.map((league) => (
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
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
