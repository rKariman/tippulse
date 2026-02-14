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
      matchCache.data && matchCache.data.length >= 1 &&
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
    const currentDate = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentSeason = currentMonth >= 7 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;

    const prompt = `You are a world-class football betting analyst with deep knowledge of every team, player, and league. Today's date is ${currentDate}. The current football season is ${currentSeason}.

YOUR TASK: Use YOUR OWN knowledge of these teams, their current squads, recent performances, playing styles, managerial tactics, injury news, and historical tendencies to predict what will happen in this match. Do your own research from your training data — do not rely only on the stats below.

CRITICAL SQUAD RULES:
- All player references MUST be players CURRENTLY registered and playing for ${homeTeam} or ${awayTeam} in the ${currentSeason} season.
- Do NOT reference players from previous seasons or who have transferred away.
- Double-check EVERY player name: confirm they are on the CORRECT team's current roster. A player who once played for a team but now plays elsewhere MUST NOT be included.
- If you are not 100% certain a player is currently at one of these two clubs, do NOT include them.
- Common mistake: naming a player who transferred years ago. Verify against your knowledge of the ${currentSeason} squad lists.

Match: ${homeTeam} vs ${awayTeam}
League: ${league}
Venue: ${fixture.venue || "TBC"}
Kickoff: ${fixture.kickoff_at}

Database form data (use as supporting evidence, but rely on your own knowledge too):

${homeTeam} – Recent Form (last 5):
${homeFormStr}

${awayTeam} – Recent Form (last 5):
${awayFormStr}

Head-to-Head (last 3 meetings):
${h2hStr}

INSTRUCTIONS:

1. Use your knowledge of these teams' current season form, squad depth, injuries, tactics, and tendencies to make predictions.

2. Select EXACTLY ONE match tip from these betting markets:
   MATCH MARKETS (pick the one with the strongest edge):
   - Match Result: "Home Win", "Away Win", "Draw"
   - Double Chance: "Home or Draw", "Away or Draw", "Home or Away"
   - Both Teams To Score: "BTTS - Yes", "BTTS - No"
   - Over/Under Goals: "Over 1.5 Goals", "Over 2.5 Goals", "Over 3.5 Goals", "Under 1.5 Goals", "Under 2.5 Goals", "Under 3.5 Goals"
   - Correct Score: e.g. "2-1", "1-0", "0-0"
   - Total Cards: "Over 3.5 Cards", "Over 4.5 Cards", "Over 5.5 Cards"
   - Total Corners: "Over 7.5 Corners", "Over 8.5 Corners", "Over 9.5 Corners", "Over 10.5 Corners"
   - Total Fouls: "Over 15.5 Fouls", "Over 20.5 Fouls", "Over 25.5 Fouls"
   - Half-Time Result: "Home Leading at HT", "Away Leading at HT", "Draw at HT"
   - Clean Sheet: "${homeTeam} Clean Sheet - Yes", "${awayTeam} Clean Sheet - Yes"
   - Win to Nil: "${homeTeam} Win to Nil", "${awayTeam} Win to Nil"
   - First Team to Score: "${homeTeam} to Score First", "${awayTeam} to Score First"
   - Handicap: e.g. "${homeTeam} -1.5", "${awayTeam} +1.5"

3. Your tip_type must be one of: "match_result", "double_chance", "btts", "over_under", "correct_score", "total_cards", "total_corners", "total_fouls", "half_time", "clean_sheet", "win_to_nil", "first_to_score", "handicap".

4. Pick the market where you see the STRONGEST edge based on your knowledge. CRITICAL: Do NOT default to corners or any single market. You MUST vary your picks — consider ALL 13 market categories equally. The example JSON below uses BTTS but that is just formatting; pick whichever market has the best edge for THIS specific match.

5. Confidence levels — be brutally honest:
   - "high" = you would bet your own money, strong evidence
   - "medium" = reasonable case but some uncertainty
   - "low" = speculative value pick

6. Reasoning: 3-5 lines. Reference SPECIFIC facts: recent results, goal-scoring records, defensive stats, disciplinary records, corner averages, tactical matchups. Justify why THIS market over others.

7. NEVER mention "limited data" or "lack of information". Use your football knowledge confidently.

8. Provide EXACTLY 2 PLAYER TIPS with REAL players CURRENTLY at these clubs in ${currentSeason}.
   You MUST pick from ONLY these player betting markets, listed from HIGHEST to LOWEST probability of winning:

   HIGH PROBABILITY (prefer these — easier to hit):
    - "shots_on_target" (Player 1+ Shots on Target) — ~55-65% hit rate for key attackers
    - "over_under_shots" (Player Over 1.5 Shots) — ~50-60% hit rate
    - "over_under_tackles" (Player Over 1.5 Tackles) — ~50-55% for defensive midfielders/fullbacks
    - "over_under_passes" (Player Over X Passes) — ~50-55% for midfielders

   MEDIUM PROBABILITY:
    - "player_yellow_card" (Player to Receive a Yellow Card) — ~20-35% for aggressive players
    - "player_assist" (Player to Assist) — ~15-25% for creative players

   LOW PROBABILITY (use sparingly — only when very strong case):
    - "anytime_goalscorer" (Anytime Goalscorer) — ~10-20% even for top strikers
    - "first_goalscorer" (First Goalscorer) — ~5-10%
    - "2_plus_goals" (2+ Goals) — ~3-8%
    - "goal_and_assist" (Goal + Assist combo) — ~2-5%

   CRITICAL: You MUST prioritize HIGH PROBABILITY markets. Only pick low-probability markets (goalscorer, 2+ goals, goal+assist) if you have exceptional evidence. Most tips should come from shots, tackles, passes, or cards.
   Do NOT default to "anytime_goalscorer" — it is one of the hardest bets to win.

   For each player tip you MUST consider:
   - The player's recent form (goals, shots, assists, cards, minutes played)
   - The opponent's defensive weaknesses
   - The player's role and position
   - The PROBABILITY of the bet hitting — favour high-probability markets
   Pick the 2 STRONGEST, most likely-to-win player bets from the list above.

Return ONLY valid JSON (no markdown):
{
  "matchTips": [
    {
      "tip_type": "btts",
      "title": "BTTS - Yes",
      "confidence": "high",
      "odds": "4/5",
      "reasoning": "3-5 lines with specific facts justifying this pick"
    }
  ],
  "playerTips": [
    {
      "player_name": "Player Currently At Club",
      "bet_type": "shots_on_target",
      "title": "Player Currently At Club - 1+ Shots on Target",
      "confidence": "medium",
      "reasoning": "2-3 sentences referencing recent form, matchup stats, or season data"
    }
  ]
}

Rules:
- matchTips: EXACTLY 1 tip. Choose the single best market from the full list above.
- playerTips: EXACTLY 2 tips with REAL players currently at these clubs in ${currentSeason}.
- bet_type MUST be one of the 10 allowed player markets listed above.
- reasoning MUST reference specific form, matchup, or statistical data. Generic reasoning is NOT allowed.
- odds: fractional UK format like "8/11", "6/4", "7/1"
- NEVER reference players who have left the club.
- NEVER say "limited data" or similar phrases.
- No emojis in any field.
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

    const matchTipsRows = (tips.matchTips || []).slice(0, 1).map((t: any) => ({
      fixture_id: fixtureId,
      tip_type: t.tip_type || "bet_of_the_day",
      title: t.title,
      confidence: t.confidence || "medium",
      odds: t.odds || null,
      reasoning: t.reasoning,
      expires_at: expiresAt,
    }));

    // Pad to exactly 1 match tip if AI returned nothing
    if (matchTipsRows.length < 1) {
      matchTipsRows.push({
        fixture_id: fixtureId,
        tip_type: "bet_of_the_day",
        title: "Home Win",
        confidence: "low",
        odds: null,
        reasoning: "Insufficient data for confident prediction.",
        expires_at: expiresAt,
      });
    }

    const playerTipsRows = (tips.playerTips || []).slice(0, 2).map((t: any) => ({
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
