import { Layout } from "@/components/layout/Layout";
import { TipCard } from "@/components/cards/TipCard";
import { MatchRow } from "@/components/cards/MatchRow";
import { OfferCard } from "@/components/cards/OfferCard";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { LeagueChip } from "@/components/cards/LeagueChip";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { useUpcomingFixtures, useFeaturedLeagues, usePreviews } from "@/hooks/useMatchData";
import {
  mockTips,
  mockFixtures,
  mockOffers,
  mockArticles,
  mockLeagues,
  mockPreviews,
} from "@/lib/mockData";

export default function HomePage() {
  // Fetch real data - today's matches, limit 10
  const { data: realFixtures, isLoading: fixturesLoading } = useUpcomingFixtures({ 
    limit: 10, 
    dateRange: "today" 
  });
  const { data: realLeagues } = useFeaturedLeagues();
  const { data: previews } = usePreviews();

  // Use real data if available, otherwise fallback to mock
  const hasRealFixtures = realFixtures && realFixtures.length > 0;
  const hasRealLeagues = realLeagues && realLeagues.length > 0;

  const featuredTips = mockTips.slice(0, 4);
  const featuredOffers = mockOffers.slice(0, 3);
  const latestArticles = mockArticles.slice(0, 4);
  const featuredLeagues = hasRealLeagues 
    ? realLeagues 
    : mockLeagues.filter((l) => l.is_featured);

  // Create a map of fixture IDs to preview slugs
  const previewMap = new Map<string, string>();
  if (previews) {
    previews.forEach((p) => {
      previewMap.set(p.fixture_id, p.slug);
    });
  }
  mockPreviews.forEach((p) => {
    previewMap.set(p.fixture.id, p.slug);
  });

  // Convert real fixtures to display format - ONLY show real data, no mock fallback
  const todayFixtures = (realFixtures || []).map((f) => ({
    id: f.id,
    homeTeam: f.home_team?.name || "TBD",
    awayTeam: f.away_team?.name || "TBD",
    kickoffAt: f.kickoff_at,
    league: f.league?.name || "",
    venue: f.venue,
    slug: f.slug,
    previewSlug: previewMap.get(f.id) || f.slug,
  }));

  return (
    <Layout>
      <div className="container py-6">
        {/* Hero section */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-brand-800 to-brand-900 rounded-2xl p-6 md:p-8 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Free Football Betting Tips & Predictions
            </h1>
            <p className="text-brand-200 text-sm md:text-base max-w-2xl">
              Expert tips from our team of professional tipsters. Get daily predictions, accumulators, and match previews for all major leagues.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link to="/tips/bet-of-the-day" className="btn-cta">
                Today's Tips
              </Link>
              <Link to="/predictions" className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
                Match Predictions
              </Link>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Top Offers */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Top Free Bet Offers</h2>
                <Link to="/free-bets" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    id={offer.id}
                    title={offer.title}
                    description={offer.description}
                    bookmaker={offer.bookmaker}
                    targetUrl={offer.targetUrl}
                    slug={offer.slug}
                  />
                ))}
              </div>
            </section>

            {/* Latest Tips */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Latest Football Tips</h2>
                <Link to="/tips/bet-of-the-day" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              <div className="space-y-4">
                {featuredTips.map((tip) => (
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
            </section>

            {/* Featured Matches */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Today's Matches</h2>
                <Link to="/predictions" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              {fixturesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
              ) : todayFixtures.length === 0 ? (
                <div className="text-center py-8 text-ink-500">
                  <p>No matches found for today.</p>
                  <p className="text-sm mt-1">Run sync from /admin/sync to fetch matches.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayFixtures.map((fixture) => (
                    <MatchRow
                      key={fixture.id}
                      id={fixture.id}
                      homeTeam={fixture.homeTeam}
                      awayTeam={fixture.awayTeam}
                      kickoffAt={fixture.kickoffAt}
                      league={fixture.league}
                      venue={fixture.venue}
                      previewSlug={fixture.previewSlug}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Featured Leagues */}
            <section>
              <h2 className="section-title mb-4">Popular Leagues</h2>
              <div className="flex flex-wrap gap-2">
                {featuredLeagues.map((league) => (
                  <LeagueChip
                    key={league.id}
                    name={league.name}
                    slug={league.slug}
                    matchCount={hasRealFixtures 
                      ? realFixtures.filter((f) => f.league?.id === league.id).length
                      : mockFixtures.filter((f) => f.league.id === league.id).length
                    }
                  />
                ))}
              </div>
            </section>

            {/* Latest News */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Latest News</h2>
                <Link to="/news" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {latestArticles.slice(0, 2).map((article) => (
                  <ArticleCard
                    key={article.id}
                    id={article.id}
                    title={article.title}
                    excerpt={article.excerpt}
                    slug={article.slug}
                    publishedAt={article.publishedAt}
                    articleType={article.article_type}
                    featured
                  />
                ))}
              </div>
              <div className="space-y-3 mt-4">
                {latestArticles.slice(2).map((article) => (
                  <ArticleCard
                    key={article.id}
                    id={article.id}
                    title={article.title}
                    excerpt={article.excerpt}
                    slug={article.slug}
                    publishedAt={article.publishedAt}
                    articleType={article.article_type}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <NewsletterWidget />

            {/* Quick Links Widget */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Quick Links</div>
              <div className="p-4 space-y-2">
                <Link to="/tips/acca" className="block py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
                  Accumulator Tips
                </Link>
                <Link to="/tips/btts" className="block py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
                  Both Teams to Score
                </Link>
                <Link to="/tips/correct-score" className="block py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
                  Correct Score Tips
                </Link>
                <Link to="/predictions" className="block py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
                  Match Predictions
                </Link>
                <Link to="/free-bets" className="block py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
                  Free Bets
                </Link>
              </div>
            </div>

            {/* Today's Tips Widget */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Today's Tips</div>
              <div className="divide-y divide-ink-100">
                {featuredTips.slice(0, 3).map((tip) => (
                  <div key={tip.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-400">{tip.fixture.league.name}</span>
                      <span className="odds-display text-xs px-2 py-0.5">{tip.odds.toFixed(2)}</span>
                    </div>
                    <p className="text-sm font-medium text-ink-900">{tip.selection}</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {tip.fixture.homeTeam.name} vs {tip.fixture.awayTeam.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
