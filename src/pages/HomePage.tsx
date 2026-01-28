import { Layout } from "@/components/layout/Layout";
import { MatchRow } from "@/components/cards/MatchRow";
import { OfferCard } from "@/components/cards/OfferCard";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { LeagueChip } from "@/components/cards/LeagueChip";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, Trophy, Clock, TrendingUp } from "lucide-react";
import { useUpcomingFixtures, useFeaturedLeagues, usePreviews, useLeagues } from "@/hooks/useMatchData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTodayFixturesForTips, useGenerateAITips } from "@/hooks/useTodayTips";

export default function HomePage() {
  // Fetch real data - today's and tomorrow's matches with auto-refresh for live scores
  const { data: realFixtures, isLoading: fixturesLoading } = useUpcomingFixtures({ 
    limit: 10, 
    dateRange: "upcoming" 
  });
  // Re-fetch fixtures every 30 seconds to get latest live scores from Supabase
  useQuery({
    queryKey: ["fixtures", "live-refresh"],
    queryFn: async () => Date.now(),
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: false,
  });
  const { data: realLeagues } = useFeaturedLeagues();
  const { data: allLeagues } = useLeagues();
  const { data: previews } = usePreviews();

  // Fetch tips fixtures and generate AI tips for sidebar
  const { data: tipsFixtures } = useTodayFixturesForTips();
  const { tips: aiTips } = useGenerateAITips(tipsFixtures);

  // Fetch real news posts from Supabase
  const { data: newsPostsData, isLoading: newsLoading } = useQuery({
    queryKey: ["news_posts", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, slug, excerpt, cover_image_url, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  // Fetch real free bets from Supabase
  const { data: freeBetsData, isLoading: offersLoading } = useQuery({
    queryKey: ["free_bets", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_bets")
        .select("id, title, slug, bookmaker, description, target_url, is_featured")
        .eq("published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // Use real leagues if available - fallback to top leagues by fixture count
  const hasRealFeaturedLeagues = realLeagues && realLeagues.length > 0;
  const featuredLeagues = hasRealFeaturedLeagues 
    ? realLeagues 
    : (allLeagues || []).slice(0, 5);

  // Create a map of fixture IDs to preview slugs
  const previewMap = new Map<string, string>();
  if (previews) {
    previews.forEach((p) => {
      previewMap.set(p.fixture_id, p.slug);
    });
  }

  // Convert real fixtures to display format - includes live score fields
  const todayFixtures = (realFixtures || []).map((f) => ({
    id: f.id,
    homeTeam: f.home_team?.name || "TBD",
    awayTeam: f.away_team?.name || "TBD",
    kickoffAt: f.kickoff_at,
    league: f.league?.name || "",
    leagueId: f.league?.id,
    venue: f.venue,
    slug: f.slug,
    previewSlug: previewMap.get(f.id) || f.slug,
    // Live score fields
    homeScore: f.home_score,
    awayScore: f.away_score,
    phase: f.phase,
    phaseStartedAt: f.phase_started_at,
    baseMinute: f.base_minute,
  }));

  // Get top 3 tips from AI tips for sidebar widget
  const sidebarTips = (tipsFixtures || []).slice(0, 3).map((fixture) => ({
    id: fixture.id,
    fixture,
    tip: aiTips[fixture.id],
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
            {/* Top Offers - from Supabase free_bets */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Top Free Bet Offers</h2>
                <Link to="/free-bets" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              {offersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
              ) : freeBetsData && freeBetsData.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freeBetsData.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      id={offer.id}
                      title={offer.title}
                      description={offer.description}
                      bookmaker={{ name: offer.bookmaker || "Bookmaker" }}
                      targetUrl={offer.target_url}
                      slug={offer.slug}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-ink-500 bg-surface rounded-lg border border-ink-200">
                  <p>No offers available at the moment.</p>
                  <p className="text-sm mt-1">Check back soon!</p>
                </div>
              )}
            </section>

            {/* Featured Matches */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Upcoming Matches</h2>
                <Link to="/predictions" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              {fixturesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
              ) : todayFixtures.length === 0 ? (
                <div className="text-center py-8 text-ink-500 bg-surface rounded-lg border border-ink-200">
                  <Trophy size={32} className="mx-auto mb-2 text-ink-300" />
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
                      homeScore={fixture.homeScore}
                      awayScore={fixture.awayScore}
                      phase={fixture.phase}
                      phaseStartedAt={fixture.phaseStartedAt}
                      baseMinute={fixture.baseMinute}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Featured Leagues */}
            <section>
              <h2 className="section-title mb-4">Popular Leagues</h2>
              {featuredLeagues.length === 0 ? (
                <div className="text-center py-4 text-ink-500">
                  <p className="text-sm">No leagues available.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {featuredLeagues.map((league) => (
                    <LeagueChip
                      key={league.id}
                      name={league.name}
                      slug={league.slug}
                      matchCount={realFixtures?.filter((f) => f.league?.id === league.id).length || 0}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Latest News - from Supabase news_posts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Latest News</h2>
                <Link to="/news" className="link-brand text-sm flex items-center gap-1">
                  See All <ChevronRight size={16} />
                </Link>
              </div>
              {newsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
              ) : newsPostsData && newsPostsData.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {newsPostsData.slice(0, 2).map((article) => (
                      <ArticleCard
                        key={article.id}
                        id={article.id}
                        title={article.title}
                        excerpt={article.excerpt || ""}
                        slug={article.slug}
                        publishedAt={article.created_at}
                        articleType="news"
                        featured
                      />
                    ))}
                  </div>
                  {newsPostsData.length > 2 && (
                    <div className="space-y-3 mt-4">
                      {newsPostsData.slice(2).map((article) => (
                        <ArticleCard
                          key={article.id}
                          id={article.id}
                          title={article.title}
                          excerpt={article.excerpt || ""}
                          slug={article.slug}
                          publishedAt={article.created_at}
                          articleType="news"
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-ink-500 bg-surface rounded-lg border border-ink-200">
                  <p>No news articles yet.</p>
                  <p className="text-sm mt-1">Create articles in the admin panel.</p>
                </div>
              )}
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

            {/* Today's Tips Widget - Real data from AI tips */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Today's Tips</div>
              <div className="divide-y divide-ink-100">
                {sidebarTips.length === 0 ? (
                  <div className="p-4 text-center text-ink-500 text-sm">
                    <p>No tips available today.</p>
                    <Link to="/tips/bet-of-the-day" className="link-brand text-xs mt-1 block">
                      View all tips →
                    </Link>
                  </div>
                ) : (
                  sidebarTips.map(({ id, fixture, tip }) => (
                    <div key={id} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-ink-400">{fixture.league?.name || "League"}</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} className="text-ink-400" />
                          <span className="text-xs text-ink-400">
                            {new Date(fixture.kickoff_at).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Europe/Rome",
                            })}
                          </span>
                        </div>
                      </div>
                      {tip ? (
                        <>
                          <p className="text-sm font-medium text-ink-900 flex items-center gap-1">
                            <TrendingUp size={12} className="text-brand-600" />
                            {tip.prediction}
                          </p>
                          <p className="text-xs text-ink-500 mt-0.5">
                            {fixture.home_team?.name} vs {fixture.away_team?.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="h-4 bg-ink-100 rounded animate-pulse mb-1" />
                          <p className="text-xs text-ink-500">
                            {fixture.home_team?.name} vs {fixture.away_team?.name}
                          </p>
                        </>
                      )}
                    </div>
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
