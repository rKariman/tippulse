import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { TipCard } from "@/components/cards/TipCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { DateTabs } from "@/components/widgets/DateTabs";
import { LeagueFilter } from "@/components/widgets/LeagueFilter";
import { useState } from "react";
import { mockTips, mockLeagues, mockPreviews } from "@/lib/mockData";

const marketLabels: Record<string, string> = {
  "bet-of-the-day": "Bet of the Day",
  "acca": "Accumulator Tips",
  "btts": "Both Teams to Score",
  "correct-score": "Correct Score Tips",
  "over-under": "Over/Under Goals",
  "double-chance": "Double Chance",
};

export default function TipsPage() {
  const { market = "bet-of-the-day" } = useParams<{ market: string }>();
  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "upcoming">("today");
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  const marketTitle = marketLabels[market] || "Football Tips";
  
  // Filter tips by market
  const filteredTips = mockTips.filter((tip) => {
    if (market !== "bet-of-the-day" && tip.market !== market) return false;
    if (leagueFilter && tip.fixture.league.slug !== leagueFilter) return false;
    return true;
  });

  return (
    <Layout>
      <div className="container py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">{marketTitle}</h1>
          <p className="text-ink-500 text-sm max-w-2xl">
            Check in for the best free football betting tips for today's matches. Our football tips are made by industry experts, giving you the inside scoop on all the big matches.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="space-y-4">
              <DateTabs selected={dateFilter} onChange={setDateFilter} />
              <LeagueFilter
                leagues={mockLeagues}
                selected={leagueFilter}
                onChange={setLeagueFilter}
              />
            </div>

            {/* Tips list */}
            {filteredTips.length > 0 ? (
              <div className="space-y-4">
                {filteredTips.map((tip) => (
                  <TipCard
                    key={tip.id}
                    id={tip.id}
                    title={tip.title}
                    fixture={{
                      homeTeam: tip.fixture.homeTeam.name,
                      awayTeam: tip.fixture.awayTeam.name,
                      kickoffAt: tip.fixture.kickoffAt,
                      league: tip.fixture.league.name,
                    }}
                    selection={tip.selection}
                    odds={tip.odds}
                    stars={tip.stars}
                    reasoningShort={tip.reasoningShort}
                    reasoningLong={tip.reasoningLong}
                    previewSlug={mockPreviews.find((p) => p.fixture.id === tip.fixture.id)?.slug}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">No tips available for this selection.</p>
                <p className="text-sm text-ink-400 mt-1">Try changing the filters or check back later.</p>
              </div>
            )}

            {/* Load more */}
            {filteredTips.length > 0 && (
              <div className="text-center">
                <button className="btn-secondary">Load More Tips</button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <NewsletterWidget />

            {/* Popular Markets */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Popular Markets</div>
              <div className="p-4 space-y-2">
                {Object.entries(marketLabels).map(([slug, label]) => (
                  <a
                    key={slug}
                    href={`/tips/${slug}`}
                    className={`block py-2 px-3 text-sm rounded-lg transition-colors ${
                      market === slug
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-ink-700 hover:bg-ink-50"
                    }`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Top Leagues */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Top Leagues</div>
              <div className="p-4 space-y-2">
                {mockLeagues.slice(0, 5).map((league) => (
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
