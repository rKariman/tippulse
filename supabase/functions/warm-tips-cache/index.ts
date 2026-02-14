import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed league external IDs
const ALLOWED_LEAGUES = ["2", "39", "61", "78", "135", "140", "290", "307"];

// Batch size and delay for rate limiting
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

interface TipGenerationRun {
  id: string;
  run_type: string;
  started_at: string;
  finished_at: string | null;
  total_fixtures: number;
  generated: number;
  reused: number;
  deleted: number;
  errors: number;
  error_details: string | null;
  params: Record<string, unknown> | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SYNC_ADMIN_TOKEN = Deno.env.get("SYNC_ADMIN_TOKEN");

  // Authorization check - require service role key or cron token
  const authHeader = req.headers.get("Authorization");
  const cronToken = req.headers.get("x-cron-token");
  
  const isAuthorizedByServiceRole = authHeader && SUPABASE_SERVICE_ROLE_KEY && 
    authHeader.replace("Bearer ", "") === SUPABASE_SERVICE_ROLE_KEY;
  const isAuthorizedByCronToken = cronToken && SYNC_ADMIN_TOKEN && 
    cronToken === SYNC_ADMIN_TOKEN;
  
  if (!isAuthorizedByServiceRole && !isAuthorizedByCronToken) {
    console.log("[warm-tips-cache] Unauthorized access attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const runCleanup = body?.cleanup !== false; // default true
    const runWarmCache = body?.warmCache !== false; // default true

    console.log(`[warm-tips-cache] Starting. cleanup=${runCleanup}, warmCache=${runWarmCache}`);

    const results = {
      cleanup: { deleted_match_tips: 0, deleted_player_tips: 0 },
      warmCache: { total: 0, generated: 0, reused: 0, errors: 0 },
    };

    // ========== CLEANUP OLD TIPS ==========
    if (runCleanup) {
      console.log("[warm-tips-cache] Running cleanup of old tips...");
      
      // Delete tips for fixtures older than 2 days
      const cutoffDate = new Date();
      cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 2);
      cutoffDate.setUTCHours(0, 0, 0, 0);
      const cutoffISO = cutoffDate.toISOString();

      // Get fixture IDs that are old
      const { data: oldFixtures, error: oldFixturesError } = await supabase
        .from("fixtures")
        .select("id")
        .lt("kickoff_at", cutoffISO);

      if (oldFixturesError) {
        console.error("[warm-tips-cache] Error fetching old fixtures:", oldFixturesError);
      } else if (oldFixtures && oldFixtures.length > 0) {
        const oldFixtureIds = oldFixtures.map((f) => f.id);

        // Delete match_tips for old fixtures
        const { count: deletedMatchTips } = await supabase
          .from("match_tips")
          .delete({ count: "exact" })
          .in("fixture_id", oldFixtureIds);

        // Delete player_tips for old fixtures
        const { count: deletedPlayerTips } = await supabase
          .from("player_tips")
          .delete({ count: "exact" })
          .in("fixture_id", oldFixtureIds);

        results.cleanup.deleted_match_tips = deletedMatchTips || 0;
        results.cleanup.deleted_player_tips = deletedPlayerTips || 0;

        console.log(`[warm-tips-cache] Cleanup: deleted ${deletedMatchTips} match_tips, ${deletedPlayerTips} player_tips`);
      }

      // Delete orphan tips (tips with non-existent fixture_id)
      const { data: allMatchTipFixtures } = await supabase
        .from("match_tips")
        .select("fixture_id");
      
      if (allMatchTipFixtures && allMatchTipFixtures.length > 0) {
        const uniqueFixtureIds = [...new Set(allMatchTipFixtures.map((t) => t.fixture_id))];
        const { data: validFixtures } = await supabase
          .from("fixtures")
          .select("id")
          .in("id", uniqueFixtureIds);
        
        const validIds = new Set((validFixtures || []).map((f) => f.id));
        const orphanIds = uniqueFixtureIds.filter((id) => !validIds.has(id));

        if (orphanIds.length > 0) {
          await supabase.from("match_tips").delete().in("fixture_id", orphanIds);
          await supabase.from("player_tips").delete().in("fixture_id", orphanIds);
          console.log(`[warm-tips-cache] Deleted ${orphanIds.length} orphan tip sets`);
        }
      }

      // Log cleanup run
      await supabase.from("tip_generation_runs").insert({
        run_type: "cleanup",
        finished_at: new Date().toISOString(),
        deleted: results.cleanup.deleted_match_tips + results.cleanup.deleted_player_tips,
        params: { cutoff: cutoffISO },
      });
    }

    // ========== WARM CACHE ==========
    if (runWarmCache) {
      console.log("[warm-tips-cache] Running warm cache for upcoming fixtures...");

      // Get leagues with allowed external IDs
      const { data: leagues } = await supabase
        .from("leagues")
        .select("id, external_id")
        .in("external_id", ALLOWED_LEAGUES);

      const allowedLeagueIds = (leagues || []).map((l) => l.id);

      if (allowedLeagueIds.length === 0) {
        console.log("[warm-tips-cache] No allowed leagues found in DB");
      } else {
        // Get fixtures for next 10 days in allowed leagues
        const now = new Date();
        const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

        const { data: fixtures, error: fixturesError } = await supabase
          .from("fixtures")
          .select("id, kickoff_at, home_team:home_team_id(name), away_team:away_team_id(name)")
          .in("league_id", allowedLeagueIds)
          .gte("kickoff_at", now.toISOString())
          .lte("kickoff_at", tenDaysLater.toISOString())
          .order("kickoff_at", { ascending: true });

        if (fixturesError) {
          console.error("[warm-tips-cache] Error fetching fixtures:", fixturesError);
          throw fixturesError;
        }

        const fixtureList = fixtures || [];
        results.warmCache.total = fixtureList.length;
        console.log(`[warm-tips-cache] Found ${fixtureList.length} fixtures to process`);

        // Check which fixtures already have valid cached tips
        const cacheCheckNow = new Date().toISOString();
        const fixtureIds = fixtureList.map((f) => f.id);

        const { data: existingMatchTips } = await supabase
          .from("match_tips")
          .select("fixture_id")
          .in("fixture_id", fixtureIds)
          .gt("expires_at", cacheCheckNow);

        const { data: existingPlayerTips } = await supabase
          .from("player_tips")
          .select("fixture_id")
          .in("fixture_id", fixtureIds)
          .gt("expires_at", cacheCheckNow);

        // A fixture has valid cache if it has at least 2 match tips and 2 player tips
        const matchTipCounts: Record<string, number> = {};
        const playerTipCounts: Record<string, number> = {};

        (existingMatchTips || []).forEach((t) => {
          matchTipCounts[t.fixture_id] = (matchTipCounts[t.fixture_id] || 0) + 1;
        });
        (existingPlayerTips || []).forEach((t) => {
          playerTipCounts[t.fixture_id] = (playerTipCounts[t.fixture_id] || 0) + 1;
        });

        const fixturesToGenerate = fixtureList.filter((f) => {
          const hasMatchTips = (matchTipCounts[f.id] || 0) >= 2;
          const hasPlayerTips = (playerTipCounts[f.id] || 0) >= 2;
          return !(hasMatchTips && hasPlayerTips);
        });

        results.warmCache.reused = fixtureList.length - fixturesToGenerate.length;
        console.log(`[warm-tips-cache] ${results.warmCache.reused} fixtures already have valid cache, ${fixturesToGenerate.length} need generation`);

        // Process in batches
        const errorDetails: string[] = [];

        for (let i = 0; i < fixturesToGenerate.length; i += BATCH_SIZE) {
          const batch = fixturesToGenerate.slice(i, i + BATCH_SIZE);
          console.log(`[warm-tips-cache] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(fixturesToGenerate.length / BATCH_SIZE)}`);

          const batchPromises = batch.map(async (fixture) => {
            try {
              const homeTeam = (fixture.home_team as any)?.name || "Home";
              const awayTeam = (fixture.away_team as any)?.name || "Away";
              console.log(`[warm-tips-cache] Generating tips for: ${homeTeam} vs ${awayTeam}`);

              // Call ensure-tips edge function
              const ensureResponse = await fetch(`${SUPABASE_URL}/functions/v1/ensure-tips`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ fixture_id: fixture.id }),
              });

              if (!ensureResponse.ok) {
                const errText = await ensureResponse.text();
                throw new Error(`ensure-tips failed: ${ensureResponse.status} - ${errText}`);
              }

              const result = await ensureResponse.json();
              if (result.cached) {
                // Was already cached (race condition)
                return { generated: false };
              }
              return { generated: true };
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.error(`[warm-tips-cache] Error for fixture ${fixture.id}:`, errMsg);
              errorDetails.push(`${fixture.id}: ${errMsg}`);
              return { error: true };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          
          for (const r of batchResults) {
            if (r.error) {
              results.warmCache.errors++;
            } else if (r.generated) {
              results.warmCache.generated++;
            } else {
              results.warmCache.reused++;
            }
          }

          // Delay between batches to avoid rate limits
          if (i + BATCH_SIZE < fixturesToGenerate.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }

        // Log warm cache run
        await supabase.from("tip_generation_runs").insert({
          run_type: "warm_cache",
          finished_at: new Date().toISOString(),
          total_fixtures: results.warmCache.total,
          generated: results.warmCache.generated,
          reused: results.warmCache.reused,
          errors: results.warmCache.errors,
          error_details: errorDetails.length > 0 ? errorDetails.join("\n") : null,
          params: { batch_size: BATCH_SIZE, delay_ms: BATCH_DELAY_MS },
        });
      }
    }

    console.log("[warm-tips-cache] Complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[warm-tips-cache] Error:", errMsg);

    return new Response(
      JSON.stringify({ success: false, error: "An internal error occurred. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
