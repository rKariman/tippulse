import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PreviewTipBlock } from "@/components/cards/PreviewTipBlock";
import { OfferCard } from "@/components/cards/OfferCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { Link } from "react-router-dom";
import { mockPreviews, mockOffers, mockTips, mockBookmakers } from "@/lib/mockData";

export default function MatchPreviewPage() {
  const { slug } = useParams<{ slug: string }>();

  const preview = mockPreviews.find((p) => p.slug === slug);

  if (!preview) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Preview Not Found</h1>
          <p className="text-ink-500 mb-4">The match preview you're looking for doesn't exist.</p>
          <Link to="/predictions" className="btn-primary">
            View All Predictions
          </Link>
        </div>
      </Layout>
    );
  }

  const fixture = preview.fixture;
  const kickoffTime = new Date(fixture.kickoffAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const kickoffDate = new Date(fixture.kickoffAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Get related tips
  const relatedTips = mockTips.filter((t) => t.fixture.id === fixture.id);

  return (
    <Layout>
      {/* Match header */}
      <div className="bg-brand-800 text-white">
        <div className="container py-6">
          <div className="flex items-center gap-2 text-sm text-brand-200 mb-4">
            <span>{kickoffTime}</span>
            <span>•</span>
            <span>{kickoffDate}</span>
            {fixture.venue && (
              <>
                <span>•</span>
                <span>{fixture.venue}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-8 md:gap-16">
            {/* Home team */}
            <div className="text-center">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl md:text-3xl font-bold">
                  {fixture.homeTeam.name.charAt(0)}
                </span>
              </div>
              <h2 className="font-bold text-lg md:text-xl">{fixture.homeTeam.name}</h2>
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
                  {fixture.awayTeam.name.charAt(0)}
                </span>
              </div>
              <h2 className="font-bold text-lg md:text-xl">{fixture.awayTeam.name}</h2>
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
            {/* Intro */}
            <div className="card-base p-6">
              <h1 className="text-xl font-bold text-ink-900 mb-3">{preview.title}</h1>
              <p className="text-ink-600">{preview.intro}</p>
            </div>

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

            {/* If no tips, show placeholder */}
            {relatedTips.length === 0 && (
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
