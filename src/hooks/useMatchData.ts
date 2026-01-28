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

export function useUpcomingFixtures(options?: {
  leagueSlug?: string | null;
  limit?: number;
  dateRange?: "today" | "tomorrow" | "upcoming";
}) {
  const { leagueSlug, limit = 20, dateRange = "upcoming" } = options || {};

  return useQuery({
    queryKey: ["fixtures", "upcoming", leagueSlug, dateRange, limit],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

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
          home_team:teams!fixtures_home_team_id_fkey(id, name, slug),
          away_team:teams!fixtures_away_team_id_fkey(id, name, slug),
          league:leagues!fixtures_league_id_fkey(id, name, slug)
        `)
        .order("kickoff_at", { ascending: true })
        .limit(limit);

      // Date filtering
      if (dateRange === "today") {
        query = query
          .gte("kickoff_at", today.toISOString())
          .lt("kickoff_at", tomorrow.toISOString());
      } else if (dateRange === "tomorrow") {
        query = query
          .gte("kickoff_at", tomorrow.toISOString())
          .lt("kickoff_at", dayAfterTomorrow.toISOString());
      } else {
        query = query
          .gte("kickoff_at", today.toISOString())
          .lt("kickoff_at", nextWeek.toISOString());
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

export function useFixturesByLeague(leagueSlug?: string | null) {
  return useQuery({
    queryKey: ["fixtures", "by-league", leagueSlug],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      let query = supabase
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
        .lt("kickoff_at", nextWeek.toISOString())
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
