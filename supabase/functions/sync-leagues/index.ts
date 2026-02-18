/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import { corsHeaders, handleCors, validateAdminToken, getSupabaseUrl, getSupabaseServiceRoleKey } from '../_shared/cors.ts';
import { createApiFootballProvider } from '../_shared/api-football-provider.ts';
import { upsertLeague, upsertTeam, logSyncRun } from '../_shared/upsert.ts';
import type { SyncResult } from '../_shared/types.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Validate admin token
  if (!validateAdminToken(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    // API-Football uses numeric league IDs. Popular leagues:
    // 39 = Premier League, 140 = La Liga, 135 = Serie A, 78 = Bundesliga, 2 = Champions League
    const defaultLeagues = Deno.env.get('MATCH_DEFAULT_LEAGUE_IDS') || '39,2,135,140,78';
    const leagueIds: string[] = body.leagueIds || defaultLeagues.split(',');

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey()
    );

    const provider = createApiFootballProvider(apiKey);
    const result: SyncResult = {
      success: true,
      upsertedLeagues: 0,
      upsertedTeams: 0,
      upsertedFixtures: 0,
    };

    for (const leagueId of leagueIds) {
      try {
        // Fetch and upsert league
        const league = await provider.getLeague(leagueId);
        if (league) {
          const dbLeagueId = await upsertLeague(supabase, league, provider.providerName);
          if (dbLeagueId) {
            result.upsertedLeagues++;

            // Fetch and upsert teams
            const teams = await provider.getTeamsByLeague(leagueId);
            for (const team of teams) {
              const teamId = await upsertTeam(supabase, team, provider.providerName, dbLeagueId);
              if (teamId) {
                result.upsertedTeams++;
              }
            }
          }
        }

        // Add delay between leagues to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error syncing league ${leagueId}:`, err);
      }
    }

    // Log sync run
    await logSyncRun(supabase, 'leagues', provider.providerName, { leagueIds }, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync leagues error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
