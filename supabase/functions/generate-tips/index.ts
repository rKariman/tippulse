import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { fixtures } = await req.json();

    if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
      return new Response(
        JSON.stringify({ error: "No fixtures provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating tips for ${fixtures.length} fixtures`);

    const tips = await generateTipsWithAI(fixtures);

    return new Response(
      JSON.stringify({ tips, generatedAt: new Date().toISOString() }),
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
