import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { useTodayFixturesForTips, useGenerateAITips, TipFixture, AITip } from "@/hooks/useTodayTips";
import { Loader2, AlertTriangle, TrendingUp, Clock, Trophy } from "lucide-react";

const marketLabels: Record<string, string> = {
  "bet-of-the-day": "Bet of the Day",
  "acca": "Accumulator Tips",
  "btts": "Both Teams to Score",
  "correct-score": "Correct Score Tips",
  "over-under": "Over/Under Goals",
  "double-chance": "Double Chance",
};

function ConfidenceBadge({ confidence }: { confidence: AITip["confidence"] }) {
  const colors = {
    Low: "bg-warning-100 text-warning-700 border-warning-200",
    Medium: "bg-brand-100 text-brand-700 border-brand-200",
    High: "bg-success-100 text-success-700 border-success-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${colors[confidence]}`}>
      {confidence} Confidence
    </span>
  );
}

function TipMatchCard({ fixture, tip }: { fixture: TipFixture; tip?: AITip }) {
  const kickoffTime = new Date(fixture.kickoff_at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kickoffDate = new Date(fixture.kickoff_at).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="card-base overflow-hidden">
      {/* Header with league */}
      <div className="bg-brand-800 text-white px-fluid-md py-fluid-sm flex flex-col gap-1 xs:flex-row xs:items-center xs:justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} />
          <span className="text-fluid-sm font-medium">{fixture.league?.name || "Unknown League"}</span>
        </div>
        <div className="flex items-center gap-2 text-fluid-xs text-brand-200">
          <Clock size={12} />
          <span>{kickoffDate} • {kickoffTime}</span>
        </div>
      </div>

      {/* Match info */}
      <div className="p-fluid-md">
        <div className="flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-900 text-fluid-lg">
              {fixture.home_team?.name || "Home Team"}
            </div>
            <div className="text-ink-500 text-fluid-sm">vs</div>
            <div className="font-semibold text-ink-900 text-fluid-lg">
              {fixture.away_team?.name || "Away Team"}
            </div>
          </div>
          {fixture.venue && (
            <div className="text-fluid-xs text-ink-400 xs:text-right max-w-[150px] truncate">
              {fixture.venue}
            </div>
          )}
        </div>

        {/* AI Tip */}
        {tip ? (
          <div className="bg-ink-50 border border-ink-200 rounded-lg p-fluid-sm mt-3">
            <div className="flex flex-col gap-2 xs:flex-row xs:items-start xs:justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-600" />
                <span className="font-semibold text-ink-800 text-fluid-sm">AI Tip</span>
              </div>
              <ConfidenceBadge confidence={tip.confidence} />
            </div>
            
            <div className="mb-2">
              <span className="inline-block bg-brand-600 text-white px-2 py-1 rounded text-fluid-sm font-medium">
                {tip.prediction}
              </span>
              <span className="ml-2 text-fluid-xs text-ink-500">({tip.market})</span>
            </div>
            
            <p className="text-fluid-sm text-ink-600 leading-relaxed">
              {tip.reasoning}
            </p>
          </div>
        ) : (
          <div className="bg-ink-50 border border-ink-200 rounded-lg p-fluid-sm mt-3 animate-pulse">
            <div className="h-4 bg-ink-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-ink-200 rounded w-full mb-1"></div>
            <div className="h-3 bg-ink-200 rounded w-2/3"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TipsPage() {
  const { market = "bet-of-the-day" } = useParams<{ market: string }>();
  const marketTitle = marketLabels[market] || "Football Tips";

  const { data: fixtures, isLoading: fixturesLoading, error: fixturesError } = useTodayFixturesForTips();
  const { tips, isLoading: tipsLoading } = useGenerateAITips(fixtures);

  return (
    <Layout>
      <div className="container py-fluid-lg">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-fluid-2xl font-bold text-ink-900 mb-2">{marketTitle}</h1>
          <p className="text-ink-500 text-fluid-sm max-w-2xl">
            Today's top 20 football matches with AI-powered betting insights. Our algorithm analyzes league strength and match context to provide tips.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-fluid-lg">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-fluid-md">
            {/* Disclaimer banner */}
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-fluid-md flex items-start gap-3">
              <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-fluid-sm text-warning-800 font-medium">
                  AI-generated opinions, not guaranteed. Bet responsibly. 18+
                </p>
                <p className="text-fluid-xs text-warning-600 mt-1">
                  Tips are based on general analysis and league characteristics. Always gamble responsibly.
                </p>
              </div>
            </div>

            {/* Loading state */}
            {fixturesLoading && (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-3" />
                <p className="text-ink-500">Loading today's matches...</p>
              </div>
            )}

            {/* Error state */}
            {fixturesError && (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <AlertTriangle size={32} className="text-warning-500 mx-auto mb-3" />
                <p className="text-ink-600 font-medium">Failed to load matches</p>
                <p className="text-sm text-ink-400 mt-1">Please try again later.</p>
              </div>
            )}

            {/* No matches */}
            {!fixturesLoading && !fixturesError && (!fixtures || fixtures.length === 0) && (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <Trophy size={32} className="text-ink-300 mx-auto mb-3" />
                <p className="text-ink-500">No matches scheduled for today.</p>
                <p className="text-sm text-ink-400 mt-1">Check back later for upcoming fixtures.</p>
              </div>
            )}

            {/* Matches list */}
            {fixtures && fixtures.length > 0 && (
              <div className="space-y-fluid-md">
                {tipsLoading && (
                  <div className="flex items-center gap-2 text-sm text-brand-600 mb-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generating AI tips...</span>
                  </div>
                )}
                
                {fixtures.map((fixture) => (
                  <TipMatchCard
                    key={fixture.id}
                    fixture={fixture}
                    tip={tips[fixture.id]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-fluid-lg">
            <NewsletterWidget />

            {/* Popular Markets */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Popular Markets</div>
              <div className="p-fluid-md space-y-2">
                {Object.entries(marketLabels).map(([slug, label]) => (
                  <a
                    key={slug}
                    href={`/tips/${slug}`}
                    className={`block py-2 px-3 text-fluid-sm rounded-lg transition-colors ${
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

            {/* Responsible gambling notice */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Responsible Gambling</div>
              <div className="p-fluid-md text-fluid-sm text-ink-600 space-y-2">
                <p>🔞 18+ Only</p>
                <p>Gambling can be addictive. Please play responsibly.</p>
                <p className="text-fluid-xs text-ink-400">
                  If you feel you may have a gambling problem, visit{" "}
                  <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="link-brand">
                    BeGambleAware.org
                  </a>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
