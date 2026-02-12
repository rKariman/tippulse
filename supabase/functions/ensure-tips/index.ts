import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = new Set([
  "https://tippulse.com",
  "https://www.tippulse.com",
  "https://tippulse.lovable.app",
  "https://id-preview--326fc996-c6e0-4b8c-96e1-460501409830.lovable.app",
  "https://326fc996-c6e0-4b8c-96e1-460501409830.lovableproject.com",
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://tippulse.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(body: Record<string, unknown>, req: Request, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function extractJson(raw: string): unknown {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const end = cleaned.lastIndexOf(start !== -1 && cleaned[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(cleaned);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SB_URL");
  const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ ok: false, error: "Missing Supabase configuration" }, req, 500);
  }
  if (!OPENAI_API_KEY) {
    return jsonResponse({ ok: false, error: "OPENAI_API_KEY is not configured" }, req, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let fixtureId: string;
  try {
    const body = await req.json();
    fixtureId = body.fixture_id;
    if (!fixtureId) {
      return jsonResponse({ ok: false, error: "fixture_id is required" }, req, 400);
    }
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body" }, req, 400);
  }

  try {
    // ── 1. Check for cached, non-expired tips ──
    const now = new Date().toISOString();
    const [matchCache, playerCache] = await Promise.all([
      supabase.from("match_tips").select("*").eq("fixture_id", fixtureId).gt("expires_at", now),
      supabase.from("player_tips").select("*").eq("fixture_id", fixtureId).gt("expires_at", now),
    ]);

    if (
      matchCache.data && matchCache.data.length >= 2 &&
      playerCache.data && playerCache.data.length >= 1
    ) {
      console.log(`[ensure-tips] Cache hit for fixture ${fixtureId}`);
      return jsonResponse({
        ok: true,
        matchTips: matchCache.data,
        playerTips: playerCache.data,
      }, req);
    }

    // ── 2. Fetch fixture + joined team/league info ──
    const { data: fixture, error: fixtureError } = await supabase
      .from("fixtures")
      .select(`
        id, kickoff_at, venue, status,
        home_team_id, away_team_id,
        home_team:home_team_id(name),
        away_team:away_team_id(name),
        league:league_id(name)
      `)
      .eq("id", fixtureId)
      .single();

    if (fixtureError || !fixture) {
      console.error("[ensure-tips] Fixture not found:", fixtureError);
      return jsonResponse({ ok: false, error: "Fixture not found" }, req, 404);
    }

    const homeTeam = (fixture.home_team as any)?.name || "Home Team";
    const awayTeam = (fixture.away_team as any)?.name || "Away Team";
    const league = (fixture.league as any)?.name || "League";

    // ── 2b. Fetch recent form (last 5 completed matches per team) ──
    const formatForm = (matches: any[], teamId: string) => {
      if (!matches || matches.length === 0) return "No recent data available.";
      return matches.map((m: any) => {
        const isHome = m.home_team_id === teamId;
        const ht = (m.home_team as any)?.name || "?";
        const at = (m.away_team as any)?.name || "?";
        const score = `${m.home_score ?? "?"}-${m.away_score ?? "?"}`;
        const result = m.home_score != null && m.away_score != null
          ? (isHome
              ? (m.home_score > m.away_score ? "W" : m.home_score < m.away_score ? "L" : "D")
              : (m.away_score > m.home_score ? "W" : m.away_score < m.home_score ? "L" : "D"))
          : "?";
        return `  ${ht} ${score} ${at} (${result})`;
      }).join("\n");
    };

    const finishedStatuses = ["FT", "AET", "PEN", "finished"];
    const [homeForm, awayForm] = await Promise.all([
      supabase.from("fixtures")
        .select("home_team_id, away_team_id, home_score, away_score, kickoff_at, home_team:home_team_id(name), away_team:away_team_id(name)")
        .or(`home_team_id.eq.${fixture.home_team_id},away_team_id.eq.${fixture.home_team_id}`)
        .in("status", finishedStatuses)
        .lt("kickoff_at", fixture.kickoff_at)
        .order("kickoff_at", { ascending: false })
        .limit(5),
      supabase.from("fixtures")
        .select("home_team_id, away_team_id, home_score, away_score, kickoff_at, home_team:home_team_id(name), away_team:away_team_id(name)")
        .or(`home_team_id.eq.${fixture.away_team_id},away_team_id.eq.${fixture.away_team_id}`)
        .in("status", finishedStatuses)
        .lt("kickoff_at", fixture.kickoff_at)
        .order("kickoff_at", { ascending: false })
        .limit(5),
    ]);

    const homeFormStr = formatForm(homeForm.data || [], fixture.home_team_id);
    const awayFormStr = formatForm(awayForm.data || [], fixture.away_team_id);

    // ── 2c. Head-to-head (last 3 meetings) ──
    const { data: h2hData } = await supabase.from("fixtures")
      .select("home_team_id, away_team_id, home_score, away_score, kickoff_at, home_team:home_team_id(name), away_team:away_team_id(name)")
      .or(`and(home_team_id.eq.${fixture.home_team_id},away_team_id.eq.${fixture.away_team_id}),and(home_team_id.eq.${fixture.away_team_id},away_team_id.eq.${fixture.home_team_id})`)
      .in("status", finishedStatuses)
      .lt("kickoff_at", fixture.kickoff_at)
      .order("kickoff_at", { ascending: false })
      .limit(3);

    const h2hStr = (h2hData && h2hData.length > 0)
      ? h2hData.map((m: any) => `  ${(m.home_team as any)?.name} ${m.home_score}-${m.away_score} ${(m.away_team as any)?.name}`).join("\n")
      : "No previous meetings in database.";

    console.log(`[ensure-tips] Generating tips: ${homeTeam} vs ${awayTeam} | model=${OPENAI_MODEL} | homeForm=${homeForm.data?.length || 0} awayForm=${awayForm.data?.length || 0} h2h=${h2hData?.length || 0}`);

    // ── 3. Call OpenAI ──
    const prompt = `You are a football betting expert. Analyze this upcoming match using the stats provided and give specific, data-backed betting tips.

Match: ${homeTeam} vs ${awayTeam}
League: ${league}
Venue: ${fixture.venue || "TBC"}
Kickoff: ${fixture.kickoff_at}

${homeTeam} – Recent Form (last 5):
${homeFormStr}

${awayTeam} – Recent Form (last 5):
${awayFormStr}

Head-to-Head (last 3 meetings):
${h2hStr}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "matchTips": [
    {
      "tip_type": "match_result",
      "title": "Under 2.5 Match Goals",
      "confidence": "high",
      "odds": "8/11",
      "reasoning": "2-3 sentences referencing the form/h2h data above"
    },
    {
      "tip_type": "correct_score",
      "title": "Draw 1-1",
      "confidence": "low",
      "odds": "11/2",
      "reasoning": "2-3 sentences referencing the form/h2h data above"
    }
  ],
  "playerTips": [
    {
      "player_name": "Player Name",
      "title": "Player Name To Have 1+ Shots On Target",
      "confidence": "medium",
      "reasoning": "2-3 sentences with specific reasoning"
    },
    {
      "player_name": "Another Player",
      "title": "Another Player To Score Anytime",
      "confidence": "low",
      "reasoning": "2-3 sentences with specific reasoning"
    }
  ]
}

Rules:
- matchTips: EXACTLY 2 tips. Reference the form/h2h data in reasoning.
- playerTips: 2-4 tips with real current squad players from these teams
- confidence: "high", "medium", or "low"
- odds: fractional format like "8/11", "11/2"
- DO NOT say "limited data" — use whatever stats are provided
- Return ONLY the JSON object`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "You are a football betting expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    console.log(`[ensure-tips] OpenAI response status=${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[ensure-tips] OpenAI error ${aiResponse.status}:`, errText);
      // DO NOT wipe existing tips on AI failure
      return jsonResponse({
        ok: false,
        error: `AI request failed (${aiResponse.status})`,
        matchTips: matchCache.data || [],
        playerTips: playerCache.data || [],
      }, req, 502);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let tips: any;
    try {
      tips = extractJson(content);
    } catch (parseErr) {
      console.error("[ensure-tips] Failed to parse AI response:", content);
      return jsonResponse({
        ok: false,
        error: "Failed to parse AI response",
        matchTips: matchCache.data || [],
        playerTips: playerCache.data || [],
      }, req, 502);
    }

    // ── 4. Prepare rows ──
    const kickoff = new Date(fixture.kickoff_at);
    const expiresAt = new Date(kickoff.getTime() + 48 * 60 * 60 * 1000).toISOString();

    const matchTipsRows = (tips.matchTips || []).slice(0, 2).map((t: any) => ({
      fixture_id: fixtureId,
      tip_type: t.tip_type || "match_result",
      title: t.title,
      confidence: t.confidence || "medium",
      odds: t.odds || null,
      reasoning: t.reasoning,
      expires_at: expiresAt,
    }));

    // Pad to exactly 2 match tips
    while (matchTipsRows.length < 2) {
      matchTipsRows.push({
        fixture_id: fixtureId,
        tip_type: "match_result",
        title: matchTipsRows.length === 0 ? "Home Win" : "Draw",
        confidence: "low",
        odds: null,
        reasoning: "Insufficient data for confident prediction.",
        expires_at: expiresAt,
      });
    }

    const playerTipsRows = (tips.playerTips || []).slice(0, 4).map((t: any) => ({
      fixture_id: fixtureId,
      player_name: t.player_name,
      title: t.title,
      confidence: t.confidence || "medium",
      reasoning: t.reasoning,
      expires_at: expiresAt,
    }));

    // ── 5. Delete old + insert new (transactional-ish) ──
    await Promise.all([
      supabase.from("match_tips").delete().eq("fixture_id", fixtureId),
      supabase.from("player_tips").delete().eq("fixture_id", fixtureId),
    ]);

    const [insertedMatch, insertedPlayer] = await Promise.all([
      supabase.from("match_tips").insert(matchTipsRows).select(),
      playerTipsRows.length > 0
        ? supabase.from("player_tips").insert(playerTipsRows).select()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (insertedMatch.error) {
      console.error("[ensure-tips] Insert match_tips error:", insertedMatch.error);
      throw new Error("Failed to save match tips");
    }
    if (insertedPlayer.error) {
      console.error("[ensure-tips] Insert player_tips error:", insertedPlayer.error);
      throw new Error("Failed to save player tips");
    }

    // ── 6. Log to tip_generation_runs ──
    await supabase.from("tip_generation_runs").insert({
      run_type: "ensure_tips",
      total_fixtures: 1,
      generated: 1,
      reused: 0,
      errors: 0,
      params: { fixture_id: fixtureId, model: OPENAI_MODEL },
      finished_at: new Date().toISOString(),
    });

    console.log(`[ensure-tips] Generated tips for ${fixtureId}`);

    return jsonResponse({
      ok: true,
      matchTips: insertedMatch.data,
      playerTips: insertedPlayer.data || [],
    }, req);
  } catch (error) {
    console.error("[ensure-tips] Error:", error);

    // Log failure
    await supabase.from("tip_generation_runs").insert({
      run_type: "ensure_tips",
      total_fixtures: 1,
      generated: 0,
      errors: 1,
      error_details: error instanceof Error ? error.message : String(error),
      params: { fixture_id: fixtureId },
      finished_at: new Date().toISOString(),
    }).catch(() => {});

    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, req, 500);
  }
});
