import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

// Major leagues in priority order
const MAJOR_LEAGUE_PATTERNS = [
  "uefa-champions-league",
  "premier-league",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "europa-league",
  "primera-division",
];

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

function getLeaguePriority(leagueSlug: string | undefined): number {
  if (!leagueSlug) return 999;
  
  // Check for major league patterns
  for (let i = 0; i < MAJOR_LEAGUE_PATTERNS.length; i++) {
    if (leagueSlug.toLowerCase().includes(MAJOR_LEAGUE_PATTERNS[i].toLowerCase()) ||
        MAJOR_LEAGUE_PATTERNS[i].toLowerCase().includes(leagueSlug.toLowerCase())) {
      return i;
    }
  }
  
  // Check for country-based priority
  const countryPriority: Record<string, number> = {
    "england": 10,
    "spain": 11,
    "italy": 12,
    "germany": 13,
    "france": 14,
    "europe": 5,
    "world": 6,
  };
  
  for (const [country, priority] of Object.entries(countryPriority)) {
    if (leagueSlug.toLowerCase().includes(country)) {
      return priority;
    }
  }
  
  return 100; // Default low priority
}

function sortAndPrioritizeFixtures(fixtures: TipFixture[]): TipFixture[] {
  const now = new Date();
  
  return fixtures
    .sort((a, b) => {
      // First, sort by league priority
      const priorityA = getLeaguePriority(a.league?.slug);
      const priorityB = getLeaguePriority(b.league?.slug);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then by kickoff time (closest to now first, but not past)
      const kickoffA = new Date(a.kickoff_at);
      const kickoffB = new Date(b.kickoff_at);
      
      return kickoffA.getTime() - kickoffB.getTime();
    })
    .slice(0, 20);
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
      
      // Sort and prioritize to get top 20
      return sortAndPrioritizeFixtures(data as TipFixture[]);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGenerateAITips(fixtures: TipFixture[] | undefined) {
  const [tips, setTips] = useState<Record<string, AITip>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fixtures || fixtures.length === 0) return;
    
    const generateTips = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await supabase.functions.invoke("generate-tips", {
          body: {
            fixtures: fixtures.map((f) => ({
              id: f.id,
              homeTeam: f.home_team?.name || "Home Team",
              awayTeam: f.away_team?.name || "Away Team",
              league: f.league?.name || "Unknown League",
              kickoffAt: f.kickoff_at,
            })),
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const generatedTips = response.data?.tips as AITip[];
        if (generatedTips) {
          const tipsMap: Record<string, AITip> = {};
          generatedTips.forEach((tip) => {
            tipsMap[tip.fixtureId] = tip;
          });
          setTips(tipsMap);
        }
      } catch (err) {
        console.error("Error generating tips:", err);
        setError(err instanceof Error ? err.message : "Failed to generate tips");
        
        // Generate fallback tips client-side
        const fallbackTips: Record<string, AITip> = {};
        fixtures.forEach((fixture) => {
          fallbackTips[fixture.id] = generateFallbackTip(fixture);
        });
        setTips(fallbackTips);
      } finally {
        setIsLoading(false);
      }
    };

    generateTips();
  }, [fixtures]);

  return { tips, isLoading, error };
}

function generateFallbackTip(fixture: TipFixture): AITip {
  const markets = [
    { type: "Match Result", predictions: ["Home Win", "Draw", "Away Win"] },
    { type: "Over/Under 2.5", predictions: ["Over 2.5 Goals", "Under 2.5 Goals"] },
    { type: "BTTS", predictions: ["Both Teams to Score - Yes", "Both Teams to Score - No"] },
  ];
  
  const market = markets[Math.floor(Math.random() * markets.length)];
  const prediction = market.predictions[Math.floor(Math.random() * market.predictions.length)];
  
  const leaguePriority = getLeaguePriority(fixture.league?.slug);
  const confidence: AITip["confidence"] = leaguePriority < 10 ? "Low" : "Low";
  
  return {
    fixtureId: fixture.id,
    prediction,
    reasoning: `Based on general league analysis. ${fixture.home_team?.name || "Home"} hosts ${fixture.away_team?.name || "Away"} in ${fixture.league?.name || "this fixture"}. Limited statistical data available for detailed analysis.`,
    confidence,
    market: market.type,
  };
}
