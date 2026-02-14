import { useParams, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { PreviewTipBlock } from "@/components/cards/PreviewTipBlock";
import { OfferCard } from "@/components/cards/OfferCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { Loader2, AlertCircle, Trophy, Clock, TrendingUp } from "lucide-react";
import { useFixtureBySlug, usePreviewByFixtureSlug } from "@/hooks/useMatchData";
import { useTodayFixturesForTips, useGenerateAITips } from "@/hooks/useTodayTips";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MatchPreviewPage() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch real fixture and preview data
  const { data: fixture, isLoading: fixtureLoading } = useFixtureBySlug(slug || "");
  const { data: preview, isLoading: previewLoading } = usePreviewByFixtureSlug(slug || "");

  // Fetch tips fixtures and AI tips for sidebar
  const { data: tipsFixtures } = useTodayFixturesForTips();
  const { data: aiTips } = useGenerateAITips(tipsFixtures);

  // Fetch real free bets from Supabase
  const { data: freeBetsData } = useQuery({
    queryKey: ["free_bets", "sidebar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_bets")
        .select("id, title, slug, bookmaker, description, target_url")
        .eq("published", true)
        .order("is_featured", { ascending: false })
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = fixtureLoading || previewLoading;

  // Get sidebar tips
  const sidebarTips = (tipsFixtures || []).slice(0, 3).map((f) => ({
    id: f.id,
    fixture: f,
    tip: aiTips[f.id],
  }));

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </Layout>
    );
  }

  // No fixture found
  if (!fixture) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <Trophy size={48} className="mx-auto text-ink-300 mb-4" />
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Match Not Found</h1>
          <p className="text-ink-500 mb-4">The match you're looking for doesn't exist.</p>
          <Link to="/predictions" className="btn-primary inline-block px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
            View All Predictions
          </Link>
        </div>
      </Layout>
    );
  }

  const displayData = {
    homeTeam: fixture.home_team?.name || "TBD",
    awayTeam: fixture.away_team?.name || "TBD",
    kickoffAt: fixture.kickoff_at,
    venue: fixture.venue,
    league: fixture.league?.name || "",
  };

  const kickoffTime = new Date(displayData.kickoffAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const kickoffDate = new Date(displayData.kickoffAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Layout>
      <SEO
        title={`${displayData.homeTeam} vs ${displayData.awayTeam} Preview & Prediction`}
        description={`Match preview and prediction for ${displayData.homeTeam} vs ${displayData.awayTeam} in ${displayData.league}. Expert analysis, team news, and betting tips.`}
        canonical={`/preview/${slug}`}
      />
      <div className="bg-brand-800 text-white">
        <div className="container py-6">
          <div className="flex items-center gap-2 text-sm text-brand-200 mb-4">
            <Clock size={14} />
            <span>{kickoffTime}</span>
            <span>•</span>
            <span>{kickoffDate}</span>
            {displayData.venue && (
              <>
                <span>•</span>
                <span>{displayData.venue}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-8 md:gap-16">
            {/* Home team */}
            <div className="text-center">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl md:text-3xl font-bold">
                  {displayData.homeTeam.charAt(0)}
                </span>
              </div>
              <h2 className="font-bold text-lg md:text-xl">{displayData.homeTeam}</h2>
            </div>

            {/* VS */}
            <div className="text-center">
              <span className="text-2xl md:text-3xl font-light text-brand-200">vs</span>
            </div>

            {/* Away team */}
            <div className="text-center">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl md:text-3xl font-bold">
                  {displayData.awayTeam.charAt(0)}
                </span>
              </div>
              <h2 className="font-bold text-lg md:text-xl">{displayData.awayTeam}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Intro - show if we have a preview */}
            {preview && (
              <div className="card-base p-6">
                <h1 className="text-xl font-bold text-ink-900 mb-3">
                  {preview.title}
                </h1>
                <p className="text-ink-600">
                  {preview.intro}
                </p>
              </div>
            )}

            {/* No preview yet message */}
            {!preview && (
              <div className="card-base p-6 text-center border-warning-500/30 bg-warning-50">
                <div className="flex items-center justify-center gap-2 text-warning-700 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">No Preview Available Yet</span>
                </div>
                <p className="text-ink-600 mb-4">
                  Our expert analysis for this match is coming soon. Check back closer to kick-off.
                </p>
                <Link
                  to="/tips/bet-of-the-day"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  View Today's Tips →
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Top Offers - from real data */}
            {freeBetsData && freeBetsData.length > 0 && (
              <div className="card-base overflow-hidden">
                <div className="widget-header">Top Offers</div>
                <div className="p-4 space-y-4">
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
              </div>
            )}

            <NewsletterWidget />

            {/* Today's Tips Widget - Real data */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Today's Tips</div>
              <div className="divide-y divide-ink-100">
                {sidebarTips.length === 0 ? (
                  <div className="p-4 text-center text-ink-500 text-sm">
                    <p>No tips available today.</p>
                  </div>
                ) : (
                  sidebarTips.map(({ id, fixture: f, tip }) => (
                    <div key={id} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-ink-400">{f.league?.name || "League"}</span>
                        <span className="text-xs text-ink-400">
                          {new Date(f.kickoff_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {tip ? (
                        <>
                          <p className="text-sm font-medium text-ink-900 flex items-center gap-1">
                            <TrendingUp size={12} className="text-brand-600" />
                            {tip.prediction}
                          </p>
                          <p className="text-xs text-ink-500 mt-0.5">
                            {f.home_team?.name} vs {f.away_team?.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="h-4 bg-ink-100 rounded animate-pulse mb-1" />
                          <p className="text-xs text-ink-500">
                            {f.home_team?.name} vs {f.away_team?.name}
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
