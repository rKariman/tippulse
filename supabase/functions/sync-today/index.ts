/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import { corsHeaders, handleCors, validateAdminToken, validateCronToken } from '../_shared/cors.ts';
import { createApiFootballProvider } from '../_shared/api-football-provider.ts';
import { logSyncRun } from '../_shared/upsert.ts';
import type { SyncResult } from '../_shared/types.ts';

function getTodayInRome(): string {
  const now = new Date();
  const romeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return romeFormatter.format(now);
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const isAdmin = validateAdminToken(req);
  const isCron = validateCronToken(req);
  
  if (!isAdmin && !isCron) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const provider = createApiFootballProvider(apiKey);
    const result: SyncResult = {
      success: true,
      upsertedLeagues: 0,
      upsertedTeams: 0,
      upsertedFixtures: 0,
    };

    const todayRome = getTodayInRome();
    console.log(`Fetching fixtures for today (Rome): ${todayRome}`);

    // Step 1: Fetch ALL fixtures for today (SINGLE API CALL)
    const fixtures = await provider.getFixturesByDateRange({
      dateFrom: todayRome,
      dateTo: todayRome,
    });

    console.log(`API returned ${fixtures.length} fixtures for ${todayRome}`);

    if (fixtures.length === 0) {
      await logSyncRun(supabase, 'today', provider.providerName, { date: todayRome }, result);
      return new Response(
        JSON.stringify({ ...result, message: 'No fixtures found for today' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect unique leagues and teams from fixture data (NO EXTRA API CALLS)
    const leagueDataMap = new Map<string, string>(); // extId -> name placeholder
    const teamDataMap = new Map<string, { name: string; leagueExtId: string }>();
    
    for (const f of fixtures) {
      leagueDataMap.set(f.leagueExternalId, `League ${f.leagueExternalId}`);
      if (f.homeTeamName) {
        teamDataMap.set(f.homeTeamExternalId, { name: f.homeTeamName, leagueExtId: f.leagueExternalId });
      }
      if (f.awayTeamName) {
        teamDataMap.set(f.awayTeamExternalId, { name: f.awayTeamName, leagueExtId: f.leagueExternalId });
      }
    }

    console.log(`Found ${leagueDataMap.size} leagues, ${teamDataMap.size} teams`);

    // Step 2: Upsert leagues (no API calls - just use IDs, names will be generic)
    const leagueIdMap = new Map<string, string>();
    
    for (const [leagueExtId] of leagueDataMap) {
      const { data: existing } = await supabase
        .from('leagues')
        .select('id')
        .eq('external_id', leagueExtId)
        .eq('provider', provider.providerName)
        .maybeSingle();

      if (existing) {
        leagueIdMap.set(leagueExtId, (existing as any).id);
      } else {
        const slug = `league-${leagueExtId}`;
        const { data, error } = await supabase
          .from('leagues')
          .insert({
            external_id: leagueExtId,
            provider: provider.providerName,
            name: `League ${leagueExtId}`,
            slug,
            sport: 'football',
            last_synced_at: new Date().toISOString(),
          } as any)
          .select('id')
          .single();

        if (error && error.code === '23505') {
          const { data: retry } = await supabase
            .from('leagues')
            .insert({
              external_id: leagueExtId,
              provider: provider.providerName,
              name: `League ${leagueExtId}`,
              slug: `${slug}-${Date.now().toString(36)}`,
              sport: 'football',
              last_synced_at: new Date().toISOString(),
            } as any)
            .select('id')
            .single();
          if (retry) {
            result.upsertedLeagues++;
            leagueIdMap.set(leagueExtId, (retry as any).id);
          }
        } else if (data) {
          result.upsertedLeagues++;
          leagueIdMap.set(leagueExtId, (data as any).id);
        }
      }
    }

    // Step 3: Upsert teams with actual names
    const teamIdMap = new Map<string, string>();
    
    for (const [teamExtId, teamData] of teamDataMap) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('external_id', teamExtId)
        .eq('provider', provider.providerName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('teams')
          .update({ name: teamData.name, last_synced_at: new Date().toISOString() })
          .eq('id', (existing as any).id);
        teamIdMap.set(teamExtId, (existing as any).id);
        continue;
      }

      const slug = createSlug(teamData.name);
      const leagueId = leagueIdMap.get(teamData.leagueExtId);

      const { data, error } = await supabase
        .from('teams')
        .insert({
          external_id: teamExtId,
          provider: provider.providerName,
          name: teamData.name,
          slug,
          league_id: leagueId,
          last_synced_at: new Date().toISOString(),
        } as any)
        .select('id')
        .single();

      if (error && error.code === '23505') {
        const { data: retry } = await supabase
          .from('teams')
          .insert({
            external_id: teamExtId,
            provider: provider.providerName,
            name: teamData.name,
            slug: `${slug}-${teamExtId}`,
            league_id: leagueId,
            last_synced_at: new Date().toISOString(),
          } as any)
          .select('id')
          .single();
        if (retry) {
          result.upsertedTeams++;
          teamIdMap.set(teamExtId, (retry as any).id);
        }
      } else if (data) {
        result.upsertedTeams++;
        teamIdMap.set(teamExtId, (data as any).id);
      }
    }

    console.log(`Upserted ${result.upsertedTeams} teams, have ${teamIdMap.size} team IDs`);

    // Step 4: Upsert fixtures
    for (const fixture of fixtures) {
      const leagueId = leagueIdMap.get(fixture.leagueExternalId);
      const homeTeamId = teamIdMap.get(fixture.homeTeamExternalId);
      const awayTeamId = teamIdMap.get(fixture.awayTeamExternalId);

      if (!homeTeamId || !awayTeamId) continue;

      const homeTeamName = fixture.homeTeamName || 'Home';
      const awayTeamName = fixture.awayTeamName || 'Away';
      const slug = createSlug(`${homeTeamName}-vs-${awayTeamName}-${fixture.externalId}`);

      const { data: existing } = await supabase
        .from('fixtures')
        .select('id')
        .eq('external_id', fixture.externalId)
        .eq('provider', provider.providerName)
        .maybeSingle();

      const fixtureData = {
        external_id: fixture.externalId,
        provider: provider.providerName,
        league_id: leagueId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        kickoff_at: fixture.kickoffAt,
        venue: fixture.venue,
        status: fixture.status,
        season: fixture.season,
        round: fixture.round,
        last_synced_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('fixtures').update(fixtureData as any).eq('id', (existing as any).id);
        result.upsertedFixtures++;
      } else {
        const { data, error } = await supabase
          .from('fixtures')
          .insert({ ...fixtureData, slug } as any)
          .select('id')
          .single();

        if (error && error.code === '23505') {
          const { data: retry } = await supabase
            .from('fixtures')
            .insert({ ...fixtureData, slug: `${slug}-${Date.now().toString(36)}` } as any)
            .select('id')
            .single();
          if (retry) result.upsertedFixtures++;
        } else if (data) {
          result.upsertedFixtures++;
        }
      }
    }

    console.log(`Sync complete: ${result.upsertedLeagues} leagues, ${result.upsertedTeams} teams, ${result.upsertedFixtures} fixtures`);

    await logSyncRun(supabase, 'today', provider.providerName, { date: todayRome, fixturesFromApi: fixtures.length }, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync today error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
