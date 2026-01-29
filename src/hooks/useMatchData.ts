// Data hooks for fetching real match data from Supabase
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Fixture {
  id: string;
  slug: string;
  kickoff_at: string;
  venue: string | null;
  status: string | null;
  season: string | null;
  round: string | null;
  // Live score fields
  home_score: number | null;
  away_score: number | null;
  phase: string | null;
  phase_started_at: string | null;
  base_minute: number | null;
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

export interface League {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  is_featured: boolean | null;
}

export interface Preview {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  fixture_id: string;
}

export function useLeagues() {
  return useQuery({
    queryKey: ["leagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("id, name, slug, country, is_featured")
        .order("name");

      if (error) throw error;
      return data as League[];
    },
  });
}

export function useFeaturedLeagues() {
  return useQuery({
    queryKey: ["leagues", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("id, name, slug, country, is_featured")
        .eq("is_featured", true)
        .order("name");

      if (error) throw error;
      return data as League[];
    },
  });
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
  
  // Day+8 at midnight (7 days from tomorrow = upcoming range end)
  const day8Start = new Date(todayStart);
  day8Start.setDate(day8Start.getDate() + 8);
  
  return {
    todayStart: todayStart.toISOString(),
    tomorrowStart: tomorrowStart.toISOString(),
    day2Start: day2Start.toISOString(),
    day8Start: day8Start.toISOString(),
  };
}

export function useUpcomingFixtures(options?: {
  leagueSlug?: string | null;
  limit?: number;
  dateRange?: "today" | "tomorrow" | "upcoming";
}) {
  const { leagueSlug, limit = 20, dateRange = "upcoming" } = options || {};

  return useQuery({
    queryKey: ["fixtures", "upcoming", leagueSlug, dateRange, limit],
    queryFn: async () => {
      const { todayStart, tomorrowStart, day2Start, day8Start } = getLocalDateBoundaries();

      let query = supabase
        .from("fixtures")
        .select(`
          id,
          slug,
          kickoff_at,
          venue,
          status,
          season,
          round,
          home_score,
          away_score,
          phase,
          phase_started_at,
          base_minute,
          home_team:teams!fixtures_home_team_id_fkey(id, name, slug),
          away_team:teams!fixtures_away_team_id_fkey(id, name, slug),
          league:leagues!fixtures_league_id_fkey(id, name, slug)
        `)
        .order("kickoff_at", { ascending: true })
        .limit(limit);

      // Date filtering based on client's local timezone
      if (dateRange === "today") {
        // Today: [todayStart, tomorrowStart)
        query = query
          .gte("kickoff_at", todayStart)
          .lt("kickoff_at", tomorrowStart);
      } else if (dateRange === "tomorrow") {
        // Tomorrow: [tomorrowStart, day2Start)
        query = query
          .gte("kickoff_at", tomorrowStart)
          .lt("kickoff_at", day2Start);
      } else {
        // Upcoming: [day2Start, day8Start) - days 2-7, excluding today and tomorrow
        query = query
          .gte("kickoff_at", day2Start)
          .lt("kickoff_at", day8Start);
      }

      // League filtering (if leagueSlug is provided)
      if (leagueSlug) {
        // First get the league id
        const { data: league } = await supabase
          .from("leagues")
          .select("id")
          .eq("slug", leagueSlug)
          .maybeSingle();

        if (league) {
          query = query.eq("league_id", league.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Fixture[];
    },
  });
}

export function useFixturesByLeague(leagueSlug?: string | null, dateRange?: "today" | "tomorrow" | "upcoming") {
  return useQuery({
    queryKey: ["fixtures", "by-league", leagueSlug, dateRange],
    queryFn: async () => {
      const { todayStart, tomorrowStart, day2Start, day8Start } = getLocalDateBoundaries();

      let startDate: string;
      let endDate: string;

      if (dateRange === "today") {
        startDate = todayStart;
        endDate = tomorrowStart;
      } else if (dateRange === "tomorrow") {
        startDate = tomorrowStart;
        endDate = day2Start;
      } else {
        // upcoming: days 2-7
        startDate = day2Start;
        endDate = day8Start;
      }

      // DEBUG: Log the exact query boundaries
      console.log(`[useFixturesByLeague] dateRange=${dateRange}`);
      console.log(`[useFixturesByLeague] Boundaries (local):`);
      console.log(`  todayStart: ${new Date(todayStart).toString()}`);
      console.log(`  tomorrowStart: ${new Date(tomorrowStart).toString()}`);
      console.log(`  day2Start: ${new Date(day2Start).toString()}`);
      console.log(`[useFixturesByLeague] Query range (UTC ISO):`);
      console.log(`  startDate: ${startDate}`);
      console.log(`  endDate: ${endDate}`);

      let query = supabase
        .from("fixtures")
        .select(`
          id,
          slug,
          kickoff_at,
          venue,
          status,
          home_score,
          away_score,
          phase,
          phase_started_at,
          base_minute,
          home_team:teams!fixtures_home_team_id_fkey(id, name, slug),
          away_team:teams!fixtures_away_team_id_fkey(id, name, slug),
          league:leagues!fixtures_league_id_fkey(id, name, slug)
        `)
        .gte("kickoff_at", startDate)
        .lt("kickoff_at", endDate)
        .order("kickoff_at", { ascending: true });

      if (leagueSlug) {
        const { data: league } = await supabase
          .from("leagues")
          .select("id")
          .eq("slug", leagueSlug)
          .maybeSingle();

        if (league) {
          query = query.eq("league_id", league.id);
        }
      }

      const { data, error } = await query;
      
      // DEBUG: Log the results
      console.log(`[useFixturesByLeague] Query returned ${data?.length || 0} fixtures`);
      if (data && data.length > 0) {
        console.log(`[useFixturesByLeague] First 5 fixtures:`);
        data.slice(0, 5).forEach((f: any, i: number) => {
          console.log(`  ${i + 1}. ${f.home_team?.name} vs ${f.away_team?.name} @ ${f.kickoff_at} (status: ${f.status})`);
        });
      }
      
      if (error) throw error;

      // Group by league - ONLY include fixtures that have a league (from allowed leagues)
      const grouped: Record<string, { league: League; fixtures: Fixture[] }> = {};
      let skippedNoLeague = 0;
      (data as Fixture[]).forEach((fixture) => {
        if (fixture.league) {
          const leagueName = fixture.league.name;
          if (!grouped[leagueName]) {
            grouped[leagueName] = {
              league: fixture.league as League,
              fixtures: [],
            };
          }
          grouped[leagueName].fixtures.push(fixture);
        } else {
          skippedNoLeague++;
        }
      });

      console.log(`[useFixturesByLeague] Grouped into ${Object.keys(grouped).length} leagues (skipped ${skippedNoLeague} fixtures without league)`);

      return Object.values(grouped);
    },
  });
}

export function useFixtureBySlug(slug: string) {
  return useQuery({
    queryKey: ["fixture", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          slug,
          kickoff_at,
          venue,
          status,
          season,
          round,
          home_score,
          away_score,
          phase,
          phase_started_at,
          base_minute,
          home_team:teams!fixtures_home_team_id_fkey(id, name, slug),
          away_team:teams!fixtures_away_team_id_fkey(id, name, slug),
          league:leagues!fixtures_league_id_fkey(id, name, slug)
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as Fixture | null;
    },
  });
}

export function usePreviewByFixtureSlug(fixtureSlug: string) {
  return useQuery({
    queryKey: ["preview", "by-fixture", fixtureSlug],
    queryFn: async () => {
      // First get fixture ID
      const { data: fixture } = await supabase
        .from("fixtures")
        .select("id")
        .eq("slug", fixtureSlug)
        .maybeSingle();

      if (!fixture) return null;

      // Then get preview
      const { data, error } = await supabase
        .from("previews")
        .select("id, slug, title, intro, fixture_id")
        .eq("fixture_id", fixture.id)
        .maybeSingle();

      if (error) throw error;
      return data as Preview | null;
    },
    enabled: !!fixtureSlug,
  });
}

export function usePreviews() {
  return useQuery({
    queryKey: ["previews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("previews")
        .select("id, slug, title, intro, fixture_id")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as Preview[];
    },
  });
}
