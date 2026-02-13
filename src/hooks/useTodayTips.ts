import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLeaguePriority, logLeagueOrder } from "@/lib/leaguePriority";

export interface TipFixture {
  id: string;
  slug: string;
  kickoff_at: string;
  venue: string | null;
  status: string | null;
  home_team: {
    id: string;
    name: string;
    slug: string;
  } | null;
  away_team: {
    id: string;
    name: string;
    slug: string;
  } | null;
  league: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface AITip {
  fixtureId: string;
  prediction: string;
  reasoning: string;
  confidence: "Low" | "Medium" | "High";
  market: string;
}

function sortAndPrioritizeFixtures(fixtures: TipFixture[]): TipFixture[] {
  const sorted = fixtures
    .sort((a, b) => {
      const priorityA = getLeaguePriority(a.league?.slug);
      const priorityB = getLeaguePriority(b.league?.slug);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      const kickoffA = new Date(a.kickoff_at);
      const kickoffB = new Date(b.kickoff_at);
      
      return kickoffA.getTime() - kickoffB.getTime();
    })
    .slice(0, 20);
  
  const uniqueLeagues = Array.from(new Set(sorted.map(f => f.league).filter(Boolean)));
  logLeagueOrder("useTodayTips", uniqueLeagues as { slug: string; name: string }[]);
  
  return sorted;
}

export function useTodayFixturesForTips() {
  return useQuery({
    queryKey: ["fixtures", "today-tips"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          slug,
          kickoff_at,
          venue,
          status,
          home_team:teams!fixtures_home_team_id_fkey(id, name, slug),
          away_team:teams!fixtures_away_team_id_fkey(id, name, slug),
          league:leagues!fixtures_league_id_fkey(id, name, slug)
        `)
        .gte("kickoff_at", today.toISOString())
        .lt("kickoff_at", tomorrow.toISOString())
        .order("kickoff_at", { ascending: true });

      if (error) throw error;
      
      return sortAndPrioritizeFixtures(data as TipFixture[]);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches AI tips for fixtures using ensure-tips edge function + match_tips cache.
 * Calls ensure-tips for each fixture (which returns cached tips or generates new ones).
 */
export function useGenerateAITips(fixtures: TipFixture[] | undefined) {
  return useQuery({
    queryKey: ["ai-tips", fixtures?.map(f => f.id).join(",")],
    queryFn: async () => {
      if (!fixtures || fixtures.length === 0) return {};

      const tipsMap: Record<string, AITip> = {};

      // Fire ensure-tips calls in parallel (max 5 concurrent)
      const batchSize = 5;
      for (let i = 0; i < fixtures.length; i += batchSize) {
        const batch = fixtures.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (fixture) => {
            try {
              const { data, error } = await supabase.functions.invoke("ensure-tips", {
                body: { fixture_id: fixture.id },
              });

              if (error) throw error;

              // Use the single main tip
              const matchTips = data?.matchTips || [];
              if (matchTips.length > 0) {
                const tip = matchTips[0];
                const confidenceMap: Record<string, AITip["confidence"]> = {
                  high: "High",
                  medium: "Medium",
                  low: "Low",
                };
                const marketLabels: Record<string, string> = {
                  match_result: "Match Result",
                  double_chance: "Double Chance",
                  btts: "Both Teams To Score",
                  over_under: "Over/Under Goals",
                  correct_score: "Correct Score",
                  total_cards: "Total Cards",
                  total_corners: "Total Corners",
                  total_fouls: "Total Fouls",
                  half_time: "Half-Time Result",
                  clean_sheet: "Clean Sheet",
                  win_to_nil: "Win to Nil",
                  first_to_score: "First to Score",
                  handicap: "Handicap",
                  bet_of_the_day: "Bet of the Day",
                  accumulator: "Accumulator Tip",
                };
                tipsMap[fixture.id] = {
                  fixtureId: fixture.id,
                  prediction: tip.title,
                  reasoning: tip.reasoning,
                  confidence: confidenceMap[tip.confidence] || "Medium",
                  market: marketLabels[tip.tip_type] || tip.tip_type,
                };
              }
            } catch (err) {
              console.warn(`[useTodayTips] Failed to get tips for ${fixture.id}:`, err);
            }
          })
        );
      }

      return tipsMap;
    },
    enabled: !!fixtures && fixtures.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
