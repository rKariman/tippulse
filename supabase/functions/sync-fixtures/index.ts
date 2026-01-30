/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import { corsHeaders, handleCors, validateAdminToken } from '../_shared/cors.ts';
import { createApiFootballProvider } from '../_shared/api-football-provider.ts';
import { upsertFixture, logSyncRun } from '../_shared/upsert.ts';
import type { SyncResult } from '../_shared/types.ts';

// Compute date range: today to today+N days (UTC)
function getDateRange(daysAhead: number = 10): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateFrom = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const dateTo = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Check if this is a scheduled/cron call (no auth needed) or manual call (needs admin token)
  const isScheduledCall = req.headers.get('x-scheduled-call') === 'true';
  
  if (!isScheduledCall && !validateAdminToken(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Auto-compute date range if not provided (for scheduled runs)
    const defaultRange = getDateRange(10);
    const dateFrom = body?.dateFrom || defaultRange.dateFrom;
    const dateTo = body?.dateTo || defaultRange.dateTo;
    const leagueIdRaw = body?.leagueId;

    // league must be ONE integer per API request. If we receive a list (e.g. "2,39" or "[2,39]"), split it.
    const requestedLeagueIds: string[] = (() => {
      if (!leagueIdRaw) return [];
      const raw = String(leagueIdRaw).trim();
      if (!raw) return [];
      const cleaned = raw.replace(/[\[\]\s]/g, '');
      const parts = cleaned.split(',').filter(Boolean);
      return parts.filter((p) => /^\d+$/.test(p));
    })();

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
      if (l.external_id) leagueIdMap.set(String(l.external_id), l.id);
    });

    const teamIdMap = new Map<string, string>();
    (teams || []).forEach((t: any) => {
      if (t.external_id) teamIdMap.set(String(t.external_id), t.id);
    });

    const result: SyncResult = {
      success: true,
      upsertedLeagues: 0,
      upsertedTeams: 0,
      upsertedFixtures: 0,
    };

    // Allowed league IDs (API-Football)
    const allowedLeagueIds = new Set(['2', '39', '61', '78', '135', '140', '290', '307']);
    const leagueIdsToSync = requestedLeagueIds.length > 0 ? requestedLeagueIds : Array.from(allowedLeagueIds);

    // Fetch fixtures (ONE league per request; season computed per date inside provider)
    let fetchedCount = 0;
    let filteredAllowedCount = 0;
    let upsertedFixturesCount = 0;

    console.log(`[sync-fixtures] Starting sync: dateFrom=${dateFrom} dateTo=${dateTo} leagues=${leagueIdsToSync.join(',')}`);

    for (const leagueId of leagueIdsToSync) {
      console.log(`[sync-fixtures] league=${leagueId} dateFrom=${dateFrom} dateTo=${dateTo}`);
      const fixtures = await provider.getFixturesByDateRange({
        dateFrom,
        dateTo,
        leagueId,
      });

      fetchedCount += fixtures.length;

      const filtered = fixtures.filter((f) => allowedLeagueIds.has(f.leagueExternalId));
      filteredAllowedCount += filtered.length;

      for (const fixture of filtered) {
        // Ensure league exists (otherwise fixtures end up with null league_id and UI groups become empty)
        if (!leagueIdMap.has(fixture.leagueExternalId)) {
          const leagueExtId = fixture.leagueExternalId;
          const slug = `league-${leagueExtId}`;
          const { data: existing } = await supabase
            .from('leagues')
            .select('id')
            .eq('external_id', leagueExtId)
            .eq('provider', provider.providerName)
            .maybeSingle();

          if (existing) {
            leagueIdMap.set(leagueExtId, (existing as any).id);
          } else {
            const { data: inserted } = await supabase
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
            if (inserted) {
              leagueIdMap.set(leagueExtId, (inserted as any).id);
              result.upsertedLeagues++;
            }
          }
        }

        // Ensure teams exist with logo URLs (otherwise upsertFixture will skip)
        const ensureTeam = async (teamExtId: string, teamName: string, leagueExtId: string, logoUrl?: string) => {
          const leagueId = leagueIdMap.get(leagueExtId);
          const { data: existing } = await supabase
            .from('teams')
            .select('id, logo_url')
            .eq('external_id', teamExtId)
            .eq('provider', provider.providerName)
            .maybeSingle();
          
          if (existing) {
            // Update logo if provided and missing/different
            if (logoUrl && (existing as any).logo_url !== logoUrl) {
              await supabase
                .from('teams')
                .update({ logo_url: logoUrl, last_synced_at: new Date().toISOString() })
                .eq('id', (existing as any).id);
            }
            teamIdMap.set(teamExtId, (existing as any).id);
            return;
          }
          
          const slug = teamName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          const { data: inserted } = await supabase
            .from('teams')
            .insert({
              external_id: teamExtId,
              provider: provider.providerName,
              name: teamName,
              slug: `${slug}-${teamExtId}`,
              league_id: leagueId,
              logo_url: logoUrl || null,
              last_synced_at: new Date().toISOString(),
            } as any)
            .select('id')
            .single();

          if (inserted) {
            teamIdMap.set(teamExtId, (inserted as any).id);
            result.upsertedTeams++;
          }
        };

        await ensureTeam(fixture.homeTeamExternalId, fixture.homeTeamName || 'Home', fixture.leagueExternalId, fixture.homeTeamLogo);
        await ensureTeam(fixture.awayTeamExternalId, fixture.awayTeamName || 'Away', fixture.leagueExternalId, fixture.awayTeamLogo);

        const fixtureId = await upsertFixture(
          supabase,
          fixture,
          provider.providerName,
          leagueIdMap,
          teamIdMap
        );

        if (fixtureId) {
          result.upsertedFixtures++;
          upsertedFixturesCount++;
        }
      }
    }

    console.log(
      `[sync-fixtures] Complete: fetchedCount=${fetchedCount} filteredAllowedCount=${filteredAllowedCount} upsertedFixturesCount=${upsertedFixturesCount}`
    );

    // Log sync run
    await logSyncRun(
      supabase,
      'fixtures',
      provider.providerName,
      {
        dateFrom,
        dateTo,
        leagueIdRaw,
        requestedLeagueIds,
        fetchedCount,
        filteredAllowedCount,
        upsertedFixturesCount,
        scheduled: isScheduledCall,
      },
      result
    );

    // Trigger warm-tips-cache after successful sync
    if (result.success && upsertedFixturesCount > 0) {
      console.log('[sync-fixtures] Triggering warm-tips-cache...');
      try {
        const warmResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/warm-tips-cache`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ warmCache: true, cleanup: true }),
          }
        );
        if (!warmResponse.ok) {
          console.error('[sync-fixtures] warm-tips-cache failed:', await warmResponse.text());
        } else {
          console.log('[sync-fixtures] warm-tips-cache triggered successfully');
        }
      } catch (warmError) {
        console.error('[sync-fixtures] Error triggering warm-tips-cache:', warmError);
      }
    }

    return new Response(
      JSON.stringify({ ...result, dateFrom, dateTo }),
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
