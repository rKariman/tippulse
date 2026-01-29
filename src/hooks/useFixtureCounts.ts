import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FixtureCounts {
  todayCount: number;
  tomorrowCount: number;
  upcomingCount: number;
  next7DaysCount: number;
  byLeague: { leagueId: string; leagueName: string; count: number }[];
  nextFixtures: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    leagueName: string;
    status: string;
  }[];
}

// Helper to get date boundaries in client's local timezone
function getLocalDateBoundaries() {
  const now = new Date();
  
  // Get today at midnight in local timezone
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Tomorrow at midnight
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  
  // Day+2 at midnight
  const day2Start = new Date(todayStart);
  day2Start.setDate(day2Start.getDate() + 2);
  
  // Day+8 at midnight
  const day8Start = new Date(todayStart);
  day8Start.setDate(day8Start.getDate() + 8);
  
  return {
    todayStart: todayStart.toISOString(),
    tomorrowStart: tomorrowStart.toISOString(),
    day2Start: day2Start.toISOString(),
    day8Start: day8Start.toISOString(),
  };
}

export function useFixtureCounts() {
  return useQuery({
    queryKey: ["fixture-counts-debug"],
    queryFn: async (): Promise<FixtureCounts> => {
      const { todayStart, tomorrowStart, day2Start, day8Start } = getLocalDateBoundaries();
      
      // Fetch all fixtures with joins for the next 7 days
      const { data: fixtures, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          kickoff_at,
          status,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name),
          league:leagues!fixtures_league_id_fkey(id, name)
        `)
        .gte("kickoff_at", todayStart)
        .lt("kickoff_at", day8Start)
        .order("kickoff_at", { ascending: true });
      
      if (error) throw error;
      
      const allFixtures = (fixtures || []) as any[];
      
      // Calculate counts
      const todayFixtures = allFixtures.filter(f => 
        f.kickoff_at >= todayStart && f.kickoff_at < tomorrowStart
      );
      const tomorrowFixtures = allFixtures.filter(f => 
        f.kickoff_at >= tomorrowStart && f.kickoff_at < day2Start
      );
      const upcomingFixtures = allFixtures.filter(f => 
        f.kickoff_at >= day2Start && f.kickoff_at < day8Start
      );
      
      // Group by league
      const leagueCounts = new Map<string, { id: string; name: string; count: number }>();
      allFixtures.forEach(f => {
        if (f.league) {
          const key = f.league.id;
          const existing = leagueCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            leagueCounts.set(key, { id: f.league.id, name: f.league.name, count: 1 });
          }
        }
      });
      
      // Next 5 fixtures
      const nextFixtures = allFixtures.slice(0, 5).map(f => ({
        id: f.id,
        homeTeam: f.home_team?.name || "TBD",
        awayTeam: f.away_team?.name || "TBD",
        kickoffAt: f.kickoff_at,
        leagueName: f.league?.name || "Unknown",
        status: f.status || "scheduled",
      }));
      
      return {
        todayCount: todayFixtures.length,
        tomorrowCount: tomorrowFixtures.length,
        upcomingCount: upcomingFixtures.length,
        next7DaysCount: allFixtures.length,
        byLeague: Array.from(leagueCounts.values()).map(l => ({
          leagueId: l.id,
          leagueName: l.name,
          count: l.count,
        })),
        nextFixtures,
      };
    },
    staleTime: 10000,
  });
}
