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

// Helper to get date boundaries in Europe/Rome timezone
function getRomeDateBoundaries() {
  // Get current time formatted as Europe/Rome
  const now = new Date();
  const romeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const romeDateStr = romeFormatter.format(now); // YYYY-MM-DD in Rome
  
  // Create date boundaries at midnight Rome time
  // Rome is UTC+1 (winter) or UTC+2 (summer)
  const todayRome = new Date(`${romeDateStr}T00:00:00+01:00`);
  
  // Adjust for DST - check if we're in summer time
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const romeNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const isDST = romeNow.getTimezoneOffset() < stdOffset;
  
  // Use correct offset
  const offset = isDST ? '+02:00' : '+01:00';
  const todayStart = new Date(`${romeDateStr}T00:00:00${offset}`);
  
  const tomorrowDate = new Date(todayStart);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  
  const day2 = new Date(todayStart);
  day2.setDate(day2.getDate() + 2);
  
  const day8 = new Date(todayStart);
  day8.setDate(day8.getDate() + 8);
  
  return {
    todayStart: todayStart.toISOString(),
    tomorrowStart: tomorrowDate.toISOString(),
    day2Start: day2.toISOString(),
    day8Start: day8.toISOString(),
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
      const { todayStart, tomorrowStart, day2Start, day8Start } = getRomeDateBoundaries();

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

      // Date filtering based on Europe/Rome timezone
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
      const { todayStart, tomorrowStart, day2Start, day8Start } = getRomeDateBoundaries();

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
      if (error) throw error;

      // Group by league
      const grouped: Record<string, { league: League; fixtures: Fixture[] }> = {};
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
        }
      });

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
