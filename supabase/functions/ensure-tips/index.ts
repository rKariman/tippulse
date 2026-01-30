import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchTip {
  id: string;
  fixture_id: string;
  tip_type: string;
  title: string;
  confidence: string;
  odds: string | null;
  reasoning: string;
  created_at: string;
  expires_at: string;
}

interface PlayerTip {
  id: string;
  fixture_id: string;
  player_name: string;
  title: string;
  confidence: string;
  reasoning: string;
  created_at: string;
  expires_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fixture_id } = await req.json();
    
    if (!fixture_id) {
      return new Response(
        JSON.stringify({ error: "fixture_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for existing valid cached tips
    const now = new Date().toISOString();
    
    const [matchTipsResult, playerTipsResult] = await Promise.all([
      supabase
        .from("match_tips")
        .select("*")
        .eq("fixture_id", fixture_id)
        .gt("expires_at", now),
      supabase
        .from("player_tips")
        .select("*")
        .eq("fixture_id", fixture_id)
        .gt("expires_at", now),
    ]);

    // If we have valid cached tips, return them
    if (
      matchTipsResult.data &&
      matchTipsResult.data.length >= 2 &&
      playerTipsResult.data &&
      playerTipsResult.data.length >= 2
    ) {
      console.log(`[ensure-tips] Returning cached tips for fixture ${fixture_id}`);
      return new Response(
        JSON.stringify({
          matchTips: matchTipsResult.data,
          playerTips: playerTipsResult.data,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Need to generate tips - first get fixture info
    const { data: fixture, error: fixtureError } = await supabase
      .from("fixtures")
      .select(`
        id,
        kickoff_at,
        venue,
        home_team:home_team_id(name),
        away_team:away_team_id(name),
        league:league_id(name)
      `)
      .eq("id", fixture_id)
      .single();

    if (fixtureError || !fixture) {
      console.error("[ensure-tips] Fixture not found:", fixtureError);
      return new Response(
        JSON.stringify({ error: "Fixture not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const homeTeam = (fixture.home_team as any)?.name || "Home Team";
    const awayTeam = (fixture.away_team as any)?.name || "Away Team";
    const league = (fixture.league as any)?.name || "League";

    console.log(`[ensure-tips] Generating tips for: ${homeTeam} vs ${awayTeam}`);

    // Generate tips using AI
    const prompt = `You are a football betting expert. Analyze this match and provide betting tips:

Match: ${homeTeam} vs ${awayTeam}
League: ${league}
Venue: ${fixture.venue || "TBC"}

Generate EXACTLY this JSON structure (no markdown, just valid JSON):
{
  "matchTips": [
    {
      "tip_type": "match_result",
      "title": "Under 2.5 Match Goals",
      "confidence": "high",
      "odds": "8/11",
      "reasoning": "Both teams have averaged under 2 goals per game in their last 5 matches..."
    },
    {
      "tip_type": "correct_score",
      "title": "Draw 1-1",
      "confidence": "low",
      "odds": "11/2",
      "reasoning": "Historical data shows these teams often draw..."
    }
  ],
  "playerTips": [
    {
      "player_name": "Player Name",
      "title": "Player Name To Have 1+ Shots On Target",
      "confidence": "medium",
      "reasoning": "This player averages 2 shots per game..."
    },
    {
      "player_name": "Another Player",
      "title": "Another Player To Be Shown A Card",
      "confidence": "medium",
      "reasoning": "High foul rate in recent matches..."
    },
    {
      "player_name": "Third Player",
      "title": "Third Player To Score Anytime",
      "confidence": "low",
      "reasoning": "Top scorer for the team..."
    }
  ]
}

Requirements:
- matchTips: EXACTLY 2 tips. First should be high/medium confidence, second can be low confidence
- playerTips: 2-4 tips with realistic player names from these teams
- confidence: must be "high", "medium", or "low"
- odds: fractional format like "8/11", "11/2", "5/1" etc
- reasoning: 1-2 sentences explaining the tip

Return ONLY the JSON, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a football betting expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("[ensure-tips] AI error:", aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    let tips;
    try {
      tips = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("[ensure-tips] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Delete old tips for this fixture
    await Promise.all([
      supabase.from("match_tips").delete().eq("fixture_id", fixture_id),
      supabase.from("player_tips").delete().eq("fixture_id", fixture_id),
    ]);

    // Insert new tips
    const matchTipsToInsert = (tips.matchTips || []).slice(0, 2).map((tip: any) => ({
      fixture_id,
      tip_type: tip.tip_type || "match_result",
      title: tip.title,
      confidence: tip.confidence || "medium",
      odds: tip.odds || null,
      reasoning: tip.reasoning,
      expires_at: expiresAt,
    }));

    // Ensure we have exactly 2 match tips
    while (matchTipsToInsert.length < 2) {
      matchTipsToInsert.push({
        fixture_id,
        tip_type: "match_result",
        title: matchTipsToInsert.length === 0 ? "Home Win" : "Draw",
        confidence: "low",
        odds: null,
        reasoning: "Insufficient data for confident prediction.",
        expires_at: expiresAt,
      });
    }

    const playerTipsToInsert = (tips.playerTips || []).slice(0, 4).map((tip: any) => ({
      fixture_id,
      player_name: tip.player_name,
      title: tip.title,
      confidence: tip.confidence || "medium",
      reasoning: tip.reasoning,
      expires_at: expiresAt,
    }));

    // Ensure we have at least 2 player tips
    while (playerTipsToInsert.length < 2) {
      playerTipsToInsert.push({
        fixture_id,
        player_name: "Key Player",
        title: "Player To Make 1+ Tackles",
        confidence: "low",
        reasoning: "General prediction based on position.",
        expires_at: expiresAt,
      });
    }

    const [insertedMatchTips, insertedPlayerTips] = await Promise.all([
      supabase.from("match_tips").insert(matchTipsToInsert).select(),
      supabase.from("player_tips").insert(playerTipsToInsert).select(),
    ]);

    if (insertedMatchTips.error) {
      console.error("[ensure-tips] Error inserting match tips:", insertedMatchTips.error);
      throw new Error("Failed to save match tips");
    }
    if (insertedPlayerTips.error) {
      console.error("[ensure-tips] Error inserting player tips:", insertedPlayerTips.error);
      throw new Error("Failed to save player tips");
    }

    console.log(`[ensure-tips] Generated and cached tips for fixture ${fixture_id}`);

    return new Response(
      JSON.stringify({
        matchTips: insertedMatchTips.data,
        playerTips: insertedPlayerTips.data,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ensure-tips] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
