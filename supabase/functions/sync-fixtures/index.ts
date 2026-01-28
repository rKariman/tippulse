/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import { corsHeaders, handleCors, validateAdminToken } from '../_shared/cors.ts';
import { createApiFootballProvider } from '../_shared/api-football-provider.ts';
import { upsertFixture, logSyncRun } from '../_shared/upsert.ts';
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
    const { dateFrom, dateTo, leagueId } = body;

    if (!dateFrom || !dateTo) {
      return new Response(
        JSON.stringify({ error: 'dateFrom and dateTo are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const provider = createApiFootballProvider(apiKey);

    // Build maps of external IDs to internal IDs
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, external_id')
      .eq('provider', provider.providerName);

    const { data: teams } = await supabase
      .from('teams')
      .select('id, external_id')
      .eq('provider', provider.providerName);

    const leagueIdMap = new Map<string, string>();
    (leagues || []).forEach((l: any) => {
      if (l.external_id) leagueIdMap.set(l.external_id, l.id);
    });

    const teamIdMap = new Map<string, string>();
    (teams || []).forEach((t: any) => {
      if (t.external_id) teamIdMap.set(t.external_id, t.id);
    });

    const result: SyncResult = {
      success: true,
      upsertedLeagues: 0,
      upsertedTeams: 0,
      upsertedFixtures: 0,
    };

    // Fetch fixtures
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

    // Log sync run
    await logSyncRun(supabase, 'fixtures', provider.providerName, { dateFrom, dateTo, leagueId }, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync fixtures error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
