/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import { corsHeaders, handleCors, validateAdminToken, validateCronToken } from '../_shared/cors.ts';
import { createFootballDataProvider } from '../_shared/football-data-provider.ts';
import { upsertLeague, upsertTeam, upsertFixture, logSyncRun } from '../_shared/upsert.ts';
import type { SyncResult } from '../_shared/types.ts';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Validate either admin token or cron token
  const isAdmin = validateAdminToken(req);
  const isCron = validateCronToken(req);
  const isCronRequest = req.method === 'GET';
  
  if (!isAdmin && !isCron) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const defaultLeagues = Deno.env.get('MATCH_API_DEFAULT_LEAGUES') || 'PL,CL,SA,PD,BL1';
    const leagueIds = defaultLeagues.split(',');

    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    if (!apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const provider = createFootballDataProvider(apiKey);
    const result: SyncResult = {
      success: true,
      upsertedLeagues: 0,
      upsertedTeams: 0,
      upsertedFixtures: 0,
    };

    // Step 1: Sync leagues and teams
    const leagueIdMap = new Map<string, string>();
    const teamIdMap = new Map<string, string>();

    for (const leagueId of leagueIds) {
      try {
        const league = await provider.getLeague(leagueId);
        if (league) {
          const dbLeagueId = await upsertLeague(supabase, league, provider.providerName);
          if (dbLeagueId) {
            result.upsertedLeagues++;
            leagueIdMap.set(league.externalId, dbLeagueId);

            const teams = await provider.getTeamsByLeague(leagueId);
            for (const team of teams) {
              const teamId = await upsertTeam(supabase, team, provider.providerName, dbLeagueId);
              if (teamId) {
                result.upsertedTeams++;
                teamIdMap.set(team.externalId, teamId);
              }
            }
          }
        }
        // Rate limit pause
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Error syncing league ${leagueId}:`, err);
      }
    }

    // Reload team map from DB to include all teams
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, external_id')
      .eq('provider', provider.providerName);
    
    (allTeams || []).forEach((t: any) => {
      if (t.external_id) teamIdMap.set(t.external_id, t.id);
    });

    // Reload league map
    const { data: allLeagues } = await supabase
      .from('leagues')
      .select('id, external_id')
      .eq('provider', provider.providerName);
    
    (allLeagues || []).forEach((l: any) => {
      if (l.external_id) leagueIdMap.set(l.external_id, l.id);
    });

    // Step 2: Sync fixtures for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFrom = formatDate(today);
    const dateTo = formatDate(tomorrow);

    for (const leagueId of leagueIds) {
      try {
        const fixtures = await provider.getFixturesByDateRange({
          dateFrom,
          dateTo,
          leagueId,
        });

        for (const fixture of fixtures) {
          const fixtureId = await upsertFixture(
            supabase,
            fixture,
            provider.providerName,
            leagueIdMap,
            teamIdMap
          );
          if (fixtureId) {
            result.upsertedFixtures++;
          }
        }
        // Rate limit pause
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error syncing fixtures for league ${leagueId}:`, err);
      }
    }

    // Log sync run
    const jobType = isCronRequest ? 'cron' : 'today';
    await logSyncRun(supabase, jobType, provider.providerName, { leagueIds, dateFrom, dateTo }, result);

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
