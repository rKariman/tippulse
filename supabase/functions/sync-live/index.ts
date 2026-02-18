// sync-live: Updates live match status and scores with minimal API calls
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, getSupabaseUrl, getSupabaseServiceRoleKey } from '../_shared/cors.ts';

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

// Allowed league IDs (API-Football)
const ALLOWED_LEAGUE_IDS = new Set([
  '2',    // UEFA Champions League
  '39',   // England Premier League
  '140',  // Spain La Liga
  '135',  // Italy Serie A
  '78',   // Germany Bundesliga
  '61',   // France Ligue 1
  '307',  // Saudi Pro League
  '290',  // Iran Persian Gulf Pro League
]);

// Phase mapping from API-Football status codes
const STATUS_TO_PHASE: Record<string, string> = {
  'TBD': 'scheduled',
  'NS': 'scheduled',
  '1H': 'live',
  'HT': 'ht',
  '2H': '2h',
  'ET': 'et1',
  'BT': 'et_ht',
  'P': 'pens',
  'SUSP': 'live',
  'INT': 'live',
  'FT': 'finished',
  'AET': 'finished',
  'PEN': 'finished',
  'PST': 'scheduled',
  'CANC': 'finished',
  'ABD': 'finished',
  'AWD': 'finished',
  'WO': 'finished',
  'LIVE': 'live',
};

// Base minute when phase starts
const PHASE_BASE_MINUTES: Record<string, number> = {
  'live': 0,     // 1st half starts at 0
  '2h': 45,      // 2nd half starts at 45
  'et1': 90,     // ET1 starts at 90
  'et2': 105,    // ET2 starts at 105
  'pens': 120,   // Penalties at 120
};

interface LiveFixture {
  id: string;
  external_id: string;
  phase: string;
  home_score: number;
  away_score: number;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Validate cron/admin token (accepts both x-cron-token and x-sync-token)
  const cronToken = req.headers.get('x-cron-token');
  const syncToken = req.headers.get('x-sync-token');
  const expectedToken = Deno.env.get('SYNC_ADMIN_TOKEN');
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const authHeader = req.headers.get('Authorization');
  
  const isAuthorized = 
    (cronToken && expectedToken && cronToken === expectedToken) ||
    (syncToken && expectedToken && syncToken === expectedToken) ||
    (authHeader && serviceRoleKey && authHeader.replace('Bearer ', '') === serviceRoleKey);
    
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getSupabaseServiceRoleKey();
  const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    
    // Check if we have any live matches
    const { data: liveMatches, error: liveError } = await supabase
      .from('fixtures')
      .select('id, external_id, phase, home_score, away_score')
      .not('phase', 'in', '("scheduled","finished")')
      .not('external_id', 'is', null);

    if (liveError) throw liveError;

    const hasLiveMatches = liveMatches && liveMatches.length > 0;
    
    // Also check for matches starting soon (within 10 minutes)
    const soonThreshold = new Date(now.getTime() + 10 * 60 * 1000);
    const { data: upcomingMatches, error: upcomingError } = await supabase
      .from('fixtures')
      .select('id, external_id')
      .eq('phase', 'scheduled')
      .gte('kickoff_at', now.toISOString())
      .lte('kickoff_at', soonThreshold.toISOString())
      .not('external_id', 'is', null);

    if (upcomingError) throw upcomingError;

    const hasUpcomingMatches = upcomingMatches && upcomingMatches.length > 0;

    // Log decision
    console.log(`Live matches: ${liveMatches?.length || 0}, Upcoming (10min): ${upcomingMatches?.length || 0}`);

    // If no live or upcoming matches, skip API call
    if (!hasLiveMatches && !hasUpcomingMatches) {
      await logSyncRun(supabase, {
        success: true,
        matchesUpdated: 0,
        providerCallSkipped: true,
        message: 'No live or upcoming matches, skipped provider call'
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          matchesUpdated: 0,
          providerCallSkipped: true,
          message: 'No live or upcoming matches'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call API-Football for live fixtures
    if (!apiFootballKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    // Fetch live fixtures from API
    const response = await fetch(`${API_FOOTBALL_BASE_URL}/fixtures?live=all`, {
      headers: {
        'x-apisports-key': apiFootballKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status}`);
    }

    const apiData = await response.json();
    
    if (apiData.errors && Object.keys(apiData.errors).length > 0) {
      console.error('API-Football errors:', apiData.errors);
    }

    const liveFromApi = apiData.response || [];
    console.log(`API returned ${liveFromApi.length} live fixtures`);

    // Filter to only allowed leagues and create map
    const apiFixtureMap = new Map<string, any>();
    for (const fixture of liveFromApi) {
      const leagueId = String(fixture.league?.id);
      if (ALLOWED_LEAGUE_IDS.has(leagueId)) {
        apiFixtureMap.set(String(fixture.fixture.id), fixture);
      }
    }
    console.log(`Filtered to ${apiFixtureMap.size} fixtures from allowed leagues`);

    let matchesUpdated = 0;

    // Update live matches from our DB
    if (liveMatches && liveMatches.length > 0) {
      for (const dbFixture of liveMatches as LiveFixture[]) {
        const apiFixture = apiFixtureMap.get(dbFixture.external_id);
        
        if (apiFixture) {
          // Match is still live - update status and scores
          const apiStatus = apiFixture.fixture.status?.short || 'NS';
          const newPhase = STATUS_TO_PHASE[apiStatus] || 'live';
          const newHomeScore = apiFixture.goals?.home ?? dbFixture.home_score;
          const newAwayScore = apiFixture.goals?.away ?? dbFixture.away_score;
          
          const phaseChanged = newPhase !== dbFixture.phase;
          const scoreChanged = newHomeScore !== dbFixture.home_score || newAwayScore !== dbFixture.away_score;

          if (phaseChanged || scoreChanged) {
            const updateData: Record<string, any> = {
              home_score: newHomeScore,
              away_score: newAwayScore,
              phase: newPhase,
              last_live_update_at: now.toISOString(),
            };

            // If phase changed, update phase_started_at and base_minute
            if (phaseChanged) {
              updateData.phase_started_at = now.toISOString();
              updateData.base_minute = PHASE_BASE_MINUTES[newPhase] ?? null;
              console.log(`Phase change: ${dbFixture.id} ${dbFixture.phase} -> ${newPhase}`);
            }

            const { error: updateError } = await supabase
              .from('fixtures')
              .update(updateData)
              .eq('id', dbFixture.id);

            if (updateError) {
              console.error(`Failed to update fixture ${dbFixture.id}:`, updateError);
            } else {
              matchesUpdated++;
            }
          }
        } else {
          // Match not in live API response - might have finished
          // Check if it was live and now should be finished
          if (!['scheduled', 'finished'].includes(dbFixture.phase)) {
            // Mark as finished if it's no longer in live feed
            const { error: finishError } = await supabase
              .from('fixtures')
              .update({
                phase: 'finished',
                last_live_update_at: now.toISOString(),
              })
              .eq('id', dbFixture.id);

            if (!finishError) {
              matchesUpdated++;
              console.log(`Marked fixture ${dbFixture.id} as finished (not in live feed)`);
            }
          }
        }
      }
    }

    // Check for matches that should start (kickoff passed but still scheduled)
    const { data: shouldStartMatches } = await supabase
      .from('fixtures')
      .select('id, external_id')
      .eq('phase', 'scheduled')
      .lt('kickoff_at', now.toISOString())
      .not('external_id', 'is', null);

    if (shouldStartMatches && shouldStartMatches.length > 0) {
      for (const match of shouldStartMatches) {
        const apiFixture = apiFixtureMap.get(match.external_id);
        if (apiFixture) {
          const apiStatus = apiFixture.fixture.status?.short || 'NS';
          const newPhase = STATUS_TO_PHASE[apiStatus] || 'scheduled';
          
          if (newPhase !== 'scheduled') {
            const { error: startError } = await supabase
              .from('fixtures')
              .update({
                phase: newPhase,
                phase_started_at: now.toISOString(),
                base_minute: PHASE_BASE_MINUTES[newPhase] ?? 0,
                home_score: apiFixture.goals?.home ?? 0,
                away_score: apiFixture.goals?.away ?? 0,
                last_live_update_at: now.toISOString(),
              })
              .eq('id', match.id);

            if (!startError) {
              matchesUpdated++;
              console.log(`Started fixture ${match.id} with phase ${newPhase}`);
            }
          }
        }
      }
    }

    await logSyncRun(supabase, {
      success: true,
      matchesUpdated,
      providerCallSkipped: false,
      apiFixturesReturned: liveFromApi.length,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesUpdated,
        providerCallSkipped: false,
        apiFixturesReturned: liveFromApi.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('sync-live error:', error);
    
    await logSyncRun(supabase, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logSyncRun(supabase: any, data: {
  success: boolean;
  matchesUpdated?: number;
  providerCallSkipped?: boolean;
  apiFixturesReturned?: number;
  message?: string;
  error?: string;
}) {
  try {
    await supabase.from('sync_runs').insert({
      job_type: 'sync-live',
      provider: 'api-football',
      success: data.success,
      upserted_fixtures: data.matchesUpdated || 0,
      error: data.error,
      params: {
        providerCallSkipped: data.providerCallSkipped,
        apiFixturesReturned: data.apiFixturesReturned,
        message: data.message,
      },
    });
  } catch (e) {
    console.error('Failed to log sync run:', e);
  }
}
