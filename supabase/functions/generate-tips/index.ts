import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface FixtureInput {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffAt: string;
}

interface AITip {
  fixtureId: string;
  prediction: string;
  reasoning: string;
  confidence: "Low" | "Medium" | "High";
  market: string;
}

interface CachedTip {
  fixture_id: string;
  prediction: string;
  reasoning: string;
  confidence: string;
  market: string;
  expires_at: string;
}

// Major leagues for confidence assessment
const MAJOR_LEAGUES = [
  "champions league",
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "europa league",
];

function isMajorLeague(leagueName: string): boolean {
  const lowerName = leagueName.toLowerCase();
  return MAJOR_LEAGUES.some((major) => lowerName.includes(major));
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getCachedTips(fixtureIds: string[]): Promise<Map<string, AITip>> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("ai_tips_cache")
    .select("fixture_id, prediction, reasoning, confidence, market, expires_at")
    .in("fixture_id", fixtureIds)
    .gt("expires_at", now);

  if (error) {
    console.error("Error fetching cached tips:", error);
    return new Map();
  }

  const cachedMap = new Map<string, AITip>();
  (data as CachedTip[]).forEach((tip) => {
    cachedMap.set(tip.fixture_id, {
      fixtureId: tip.fixture_id,
      prediction: tip.prediction,
      reasoning: tip.reasoning,
      confidence: tip.confidence as AITip["confidence"],
      market: tip.market,
    });
  });

  return cachedMap;
}

async function cacheTips(tips: AITip[]): Promise<void> {
  const supabase = getSupabaseClient();
  
  const cacheEntries = tips.map((tip) => ({
    fixture_id: tip.fixtureId,
    prediction: tip.prediction,
    reasoning: tip.reasoning,
    confidence: tip.confidence,
    market: tip.market,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  }));

  const { error } = await supabase
    .from("ai_tips_cache")
    .upsert(cacheEntries, { onConflict: "fixture_id" });

  if (error) {
    console.error("Error caching tips:", error);
  } else {
    console.log(`Cached ${tips.length} tips`);
  }
}

async function generateTipsWithAI(fixtures: FixtureInput[]): Promise<AITip[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!apiKey) {
    console.log("LOVABLE_API_KEY not configured, using heuristic tips");
    return generateHeuristicTips(fixtures);
  }

  try {
    const fixtureList = fixtures
      .map((f, i) => `${i + 1}. ${f.homeTeam} vs ${f.awayTeam} (${f.league})`)
      .join("\n");

    const prompt = `You are an expert football analyst. Generate betting tips for these matches.

MATCHES:
${fixtureList}

For each match, provide:
1. A prediction (Home Win, Draw, Away Win, Over 2.5 Goals, Under 2.5 Goals, or BTTS Yes/No)
2. Brief reasoning (2-3 sentences max)
3. Confidence level based on league quality (High for top 5 leagues, Medium for others, Low if uncertain)

Format your response as a JSON array with objects containing:
- matchIndex (1-based index)
- prediction (the betting selection)
- reasoning (brief explanation)
- confidence ("Low", "Medium", or "High")
- market ("Match Result", "Over/Under 2.5", or "BTTS")

Be conservative and analytical. Focus on general football knowledge and league characteristics.
IMPORTANT: Return ONLY valid JSON array, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert football betting analyst. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error("AI Gateway error:", response.status, await response.text());
      return generateHeuristicTips(fixtures);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return generateHeuristicTips(fixtures);
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }

    const aiTips = JSON.parse(jsonContent.trim());

    // Map AI response to our format
    return fixtures.map((fixture, index) => {
      const aiTip = aiTips.find((t: any) => t.matchIndex === index + 1);
      
      if (aiTip) {
        return {
          fixtureId: fixture.id,
          prediction: aiTip.prediction || "Home Win",
          reasoning: aiTip.reasoning || "Based on general analysis.",
          confidence: aiTip.confidence || (isMajorLeague(fixture.league) ? "Medium" : "Low"),
          market: aiTip.market || "Match Result",
        };
      }

      // Fallback for missing tips
      return generateSingleHeuristicTip(fixture);
    });
  } catch (error) {
    console.error("Error calling AI Gateway:", error);
    return generateHeuristicTips(fixtures);
  }
}

function generateSingleHeuristicTip(fixture: FixtureInput): AITip {
  const isMajor = isMajorLeague(fixture.league);
  
  // Simple heuristic: home advantage
  const markets = [
    { market: "Match Result", prediction: "Home Win" },
    { market: "Over/Under 2.5", prediction: isMajor ? "Over 2.5 Goals" : "Under 2.5 Goals" },
    { market: "BTTS", prediction: isMajor ? "Both Teams to Score - Yes" : "Both Teams to Score - No" },
  ];
  
  const selected = markets[Math.floor(Math.random() * markets.length)];
  
  return {
    fixtureId: fixture.id,
    prediction: selected.prediction,
    reasoning: `${fixture.homeTeam} have home advantage against ${fixture.awayTeam}. ${isMajor ? "Top league matchup typically delivers entertainment." : "Lower league fixture - approach with caution."}`,
    confidence: "Low",
    market: selected.market,
  };
}

function generateHeuristicTips(fixtures: FixtureInput[]): AITip[] {
  return fixtures.map((fixture) => generateSingleHeuristicTip(fixture));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fixtures, skipCache = false } = await req.json();

    if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
      return new Response(
        JSON.stringify({ error: "No fixtures provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${fixtures.length} fixtures (skipCache: ${skipCache})`);

    const fixtureIds = fixtures.map((f: FixtureInput) => f.id);
    
    // Check cache first (unless skipCache is true)
    let cachedTips = new Map<string, AITip>();
    if (!skipCache) {
      cachedTips = await getCachedTips(fixtureIds);
      console.log(`Found ${cachedTips.size} cached tips`);
    }

    // Find fixtures that need new tips
    const uncachedFixtures = fixtures.filter((f: FixtureInput) => !cachedTips.has(f.id));
    
    let newTips: AITip[] = [];
    if (uncachedFixtures.length > 0) {
      console.log(`Generating tips for ${uncachedFixtures.length} uncached fixtures`);
      newTips = await generateTipsWithAI(uncachedFixtures);
      
      // Cache the new tips
      if (newTips.length > 0) {
        await cacheTips(newTips);
      }
    }

    // Combine cached and new tips
    const allTips: AITip[] = fixtures.map((f: FixtureInput) => {
      if (cachedTips.has(f.id)) {
        return cachedTips.get(f.id)!;
      }
      return newTips.find((t) => t.fixtureId === f.id) || generateSingleHeuristicTip(f);
    });

    return new Response(
      JSON.stringify({ 
        tips: allTips, 
        generatedAt: new Date().toISOString(),
        cached: cachedTips.size,
        generated: newTips.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-tips:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
