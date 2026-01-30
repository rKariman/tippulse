import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ChevronLeft, ChevronDown, ChevronUp, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MatchTipCard } from "@/components/match/MatchTipCard";
import { PlayerTipCard } from "@/components/match/PlayerTipCard";
import { TeamLogo } from "@/components/TeamLogo";

interface MatchTip {
  id: string;
  fixture_id: string;
  tip_type: string;
  title: string;
  confidence: string;
  odds: string | null;
  reasoning: string;
}

interface PlayerTip {
  id: string;
  fixture_id: string;
  player_name: string;
  title: string;
  confidence: string;
  reasoning: string;
}

interface FixtureDetails {
  id: string;
  kickoff_at: string;
  venue: string | null;
  home_team: { name: string; logo_url: string | null } | null;
  away_team: { name: string; logo_url: string | null } | null;
  league: { name: string } | null;
}

const PLACE_BET_BASE_URL = import.meta.env.VITE_PLACE_BET_BASE_URL || "https://example.com/bet";

export default function MatchDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [fixture, setFixture] = useState<FixtureDetails | null>(null);
  const [matchTips, setMatchTips] = useState<MatchTip[]>([]);
  const [playerTips, setPlayerTips] = useState<PlayerTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFixture() {
      if (!slug) return;

      try {
        // Try to find by preview slug first
        const { data: preview } = await supabase
          .from("previews")
          .select("fixture_id")
          .eq("slug", slug)
          .maybeSingle();

        let fixtureId = preview?.fixture_id;

        // If no preview, try to find fixture by slug directly
        if (!fixtureId) {
          const { data: fixtureBySlug } = await supabase
            .from("fixtures")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          fixtureId = fixtureBySlug?.id;
        }

        if (!fixtureId) {
          setError("Match not found");
          setLoading(false);
          return;
        }

        // Fetch fixture details with logo_url
        const { data: fixtureData, error: fetchError } = await supabase
          .from("fixtures")
          .select(`
            id,
            kickoff_at,
            venue,
            home_team:home_team_id(name, logo_url),
            away_team:away_team_id(name, logo_url),
            league:league_id(name)
          `)
          .eq("id", fixtureId)
          .single();

        if (fetchError || !fixtureData) {
          setError("Failed to load match details");
          setLoading(false);
          return;
        }

        setFixture(fixtureData as unknown as FixtureDetails);
        setLoading(false);

        // Fetch tips
        setTipsLoading(true);
        const response = await supabase.functions.invoke("ensure-tips", {
          body: { fixture_id: fixtureId },
        });

        if (response.error) {
          console.error("Tips error:", response.error);
          setTipsLoading(false);
          return;
        }

        setMatchTips(response.data?.matchTips || []);
        setPlayerTips(response.data?.playerTips || []);
        setTipsLoading(false);
      } catch (err) {
        console.error("Error loading match:", err);
        setError("Failed to load match");
        setLoading(false);
      }
    }

    fetchFixture();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </Layout>
    );
  }

  if (error || !fixture) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-ink-500">{error || "Match not found"}</p>
          <Link to="/predictions" className="text-brand-600 hover:underline mt-4 inline-block">
            ← Back to Predictions
          </Link>
        </div>
      </Layout>
    );
  }

  const homeTeam = fixture.home_team?.name || "Home Team";
  const awayTeam = fixture.away_team?.name || "Away Team";
  const kickoffTime = new Date(fixture.kickoff_at).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const betBuilderOdds = "27/1";

  return (
    <Layout>
      <div className="container py-6">
        {/* Back link */}
        <Link
          to="/predictions"
          className="inline-flex items-center text-sm text-ink-500 hover:text-brand-600 mb-4"
        >
          <ChevronLeft size={16} />
          Back to Predictions
        </Link>

        {/* Match Header */}
        <div className="bg-brand-800 text-white rounded-t-xl px-4 py-3 flex items-center justify-between">
          <span className="font-medium">{kickoffTime}</span>
          <span className="text-brand-200">{fixture.venue || "TBC"}</span>
        </div>

        <div className="bg-surface border border-t-0 border-ink-200 rounded-b-xl p-6 mb-6">
          <div className="flex items-center justify-center gap-8">
            {/* Home Team */}
            <div className="text-center flex-1">
              <div className="mx-auto mb-2">
                <TeamLogo
                  logoUrl={fixture.home_team?.logo_url}
                  teamName={homeTeam}
                  size="lg"
                  className="mx-auto w-14 h-14 md:w-[72px] md:h-[72px]"
                />
              </div>
              <h2 className="font-semibold text-ink-900">{homeTeam}</h2>
            </div>

            <div className="text-2xl font-bold text-ink-400">vs</div>

            {/* Away Team */}
            <div className="text-center flex-1">
              <div className="mx-auto mb-2">
                <TeamLogo
                  logoUrl={fixture.away_team?.logo_url}
                  teamName={awayTeam}
                  size="lg"
                  className="mx-auto w-14 h-14 md:w-[72px] md:h-[72px]"
                />
              </div>
              <h2 className="font-semibold text-ink-900">{awayTeam}</h2>
            </div>
          </div>

          <p className="text-center text-sm text-ink-500 mt-4">
            Broadcast: TBC
          </p>
        </div>

        {/* Tips Loading State */}
        {tipsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600 mr-2" />
            <span className="text-ink-500">Loading tips...</span>
          </div>
        )}

        {/* FST TIPS Section */}
        {!tipsLoading && matchTips.length > 0 && (
          <div className="mb-6">
            <div className="bg-brand-800 text-white px-4 py-3 rounded-t-xl flex items-center gap-2">
              <span className="bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded">FST</span>
              <span className="font-semibold">TIPS</span>
            </div>
            <div className="bg-surface border border-t-0 border-ink-200 rounded-b-xl divide-y divide-ink-100">
              {matchTips.map((tip) => (
                <MatchTipCard
                  key={tip.id}
                  tip={tip}
                  fixtureId={fixture.id}
                  baseUrl={PLACE_BET_BASE_URL}
                />
              ))}
            </div>
          </div>
        )}

        {/* BET BUILDER Section */}
        {!tipsLoading && playerTips.length > 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-3 rounded-t-xl flex items-center gap-2">
              <span className="bg-white text-amber-600 text-xs font-bold px-2 py-0.5 rounded">BET</span>
              <span className="font-semibold">BUILDER</span>
            </div>
            <div className="bg-surface border border-t-0 border-ink-200 rounded-b-xl">
              <div className="divide-y divide-ink-100">
                {playerTips.map((tip) => (
                  <PlayerTipCard
                    key={tip.id}
                    tip={tip}
                    fixtureId={fixture.id}
                    baseUrl={PLACE_BET_BASE_URL}
                  />
                ))}
              </div>

              {/* Final Bet Builder Button */}
              <div className="p-4 border-t border-ink-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-brand-800 border border-ink-200 px-3 py-1 rounded">
                      {betBuilderOdds}
                    </span>
                    <span className="text-sm text-ink-500">odds when tipped</span>
                  </div>
                  <a
                    href={`${PLACE_BET_BASE_URL}?fixture=${fixture.id}&type=betbuilder`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2 rounded flex items-center gap-1 transition-colors"
                  >
                    PLACE BET
                    <ChevronDown size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 18+ Disclaimer */}
        <div className="bg-ink-50 border border-ink-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-warning-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-ink-600">
            <p className="font-semibold mb-1">18+ Please Gamble Responsibly</p>
            <p>
              Betting tips are for entertainment purposes only. Past performance does not guarantee
              future results. Never bet more than you can afford to lose. If you have concerns about
              gambling, please visit{" "}
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                BeGambleAware.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
