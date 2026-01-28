import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PreviewTipBlock } from "@/components/cards/PreviewTipBlock";
import { OfferCard } from "@/components/cards/OfferCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { Loader2, AlertCircle } from "lucide-react";
import { useFixtureBySlug, usePreviewByFixtureSlug } from "@/hooks/useMatchData";
import { mockPreviews, mockOffers, mockTips, mockBookmakers } from "@/lib/mockData";

export default function MatchPreviewPage() {
  const { slug } = useParams<{ slug: string }>();

  // Try to fetch real fixture data
  const { data: fixture, isLoading: fixtureLoading } = useFixtureBySlug(slug || "");
  const { data: preview, isLoading: previewLoading } = usePreviewByFixtureSlug(slug || "");

  // Fallback to mock data
  const mockPreview = mockPreviews.find((p) => p.slug === slug);
  
  const isLoading = fixtureLoading || previewLoading;

  // Determine what data to show
  const hasRealFixture = !!fixture;
  const hasPreview = !!preview || !!mockPreview;

  // Get fixture details from either real or mock data
  const fixtureData = hasRealFixture
    ? {
        homeTeam: fixture.home_team?.name || "TBD",
        awayTeam: fixture.away_team?.name || "TBD",
        kickoffAt: fixture.kickoff_at,
        venue: fixture.venue,
        league: fixture.league?.name || "",
      }
    : mockPreview
    ? {
        homeTeam: mockPreview.fixture.homeTeam.name,
        awayTeam: mockPreview.fixture.awayTeam.name,
        kickoffAt: mockPreview.fixture.kickoffAt,
        venue: mockPreview.fixture.venue,
        league: mockPreview.fixture.league.name,
      }
    : null;

  // Get related tips (from mock data for now - tips are editorial content)
  const relatedTips = mockPreview
    ? mockTips.filter((t) => t.fixture.id === mockPreview.fixture.id)
    : [];

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </Layout>
    );
  }

  // No fixture or preview found
  if (!fixtureData && !hasRealFixture) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Match Not Found</h1>
          <p className="text-ink-500 mb-4">The match you're looking for doesn't exist.</p>
          <Link to="/predictions" className="btn-primary inline-block px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
            View All Predictions
          </Link>
        </div>
      </Layout>
    );
  }

  const displayData = fixtureData || {
    homeTeam: fixture?.home_team?.name || "Team A",
    awayTeam: fixture?.away_team?.name || "Team B",
    kickoffAt: fixture?.kickoff_at || new Date().toISOString(),
    venue: fixture?.venue,
    league: fixture?.league?.name || "",
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
      {/* Match header */}
      <div className="bg-brand-800 text-white">
        <div className="container py-6">
          <div className="flex items-center gap-2 text-sm text-brand-200 mb-4">
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
              <div className="flex justify-center gap-1 mt-2">
                {["W", "W", "D", "W", "L"].map((result, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-sm text-[10px] flex items-center justify-center font-bold ${
                      result === "W"
                        ? "bg-success-500"
                        : result === "D"
                        ? "bg-warning-500"
                        : "bg-danger-500"
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
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
              <div className="flex justify-center gap-1 mt-2">
                {["L", "W", "W", "D", "W"].map((result, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-sm text-[10px] flex items-center justify-center font-bold ${
                      result === "W"
                        ? "bg-success-500"
                        : result === "D"
                        ? "bg-warning-500"
                        : "bg-danger-500"
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Intro - show if we have a preview */}
            {(preview || mockPreview) && (
              <div className="card-base p-6">
                <h1 className="text-xl font-bold text-ink-900 mb-3">
                  {preview?.title || mockPreview?.title}
                </h1>
                <p className="text-ink-600">
                  {preview?.intro || mockPreview?.intro}
                </p>
              </div>
            )}

            {/* No preview yet message */}
            {!preview && !mockPreview && hasRealFixture && (
              <div className="card-base p-6 text-center border-warning-500/30 bg-warning-50">
                <div className="flex items-center justify-center gap-2 text-warning-700 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">No Preview Yet</span>
                </div>
                <p className="text-ink-600 mb-4">
                  Our expert analysis for this match is coming soon. Check back closer to kick-off.
                </p>
                <Link
                  to="/tips/bet-of-the-day"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  View All Tips →
                </Link>
              </div>
            )}

            {/* Tips */}
            {relatedTips.map((tip) => (
              <PreviewTipBlock
                key={tip.id}
                title={tip.title}
                selection={tip.selection}
                odds={tip.odds}
                stars={tip.stars}
                reasoning={tip.reasoningLong || tip.reasoningShort}
                bookmakers={mockBookmakers.map((b) => ({
                  id: b.id,
                  name: b.name,
                  offerSlug: mockOffers.find((o) => o.bookmaker.id === b.id)?.slug || b.slug,
                }))}
              />
            ))}

            {/* If no tips and we have a preview, show placeholder */}
            {relatedTips.length === 0 && (preview || mockPreview) && (
              <div className="card-base p-6 text-center">
                <p className="text-ink-500">No tips available for this match yet.</p>
                <p className="text-sm text-ink-400 mt-1">Check back closer to kick-off.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Top Offers */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Top Offers</div>
              <div className="p-4 space-y-4">
                {mockOffers.slice(0, 2).map((offer) => (
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
            </div>

            <NewsletterWidget />

            {/* Today's Tips Widget */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Today's Tips</div>
              <div className="divide-y divide-ink-100">
                {mockTips.slice(0, 3).map((tip) => (
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
