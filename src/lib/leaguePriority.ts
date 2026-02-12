/**
 * Shared league priority ordering utility
 * Used across Predictions, Home, Tips, and any league-grouped lists
 *
 * Priority is based on API-Football league IDs (extracted from slug suffix)
 * Order: FIFA WC → UCL → UEL → La Liga → Copa del Rey → PL → FA Cup → Bundesliga → DFB Pokal → Ligue 1 → Primeira Liga → Saudi Pro → Persian Gulf
 */

// League priority order by API-Football league ID
// Lower number = higher priority (more important league)
export const LEAGUE_PRIORITY_ORDER: Record<number, number> = {
  1: 1,      // FIFA World Cup
  2: 2,      // UEFA Champions League
  3: 3,      // UEFA Europa League
  140: 4,    // La Liga
  143: 5,    // Copa del Rey
  39: 6,     // Premier League
  45: 7,     // FA Cup
  78: 8,     // Bundesliga
  81: 9,     // DFB Pokal
  61: 10,    // Ligue 1
  94: 11,    // Primeira Liga (Portugal)
  307: 12,   // Saudi Pro League
  179: 13,   // Persian Gulf Pro League
};

/** Set of all known/allowed league IDs */
export const ALLOWED_LEAGUE_IDS = new Set(Object.keys(LEAGUE_PRIORITY_ORDER).map(Number));

// The expected order of league IDs for debugging
export const EXPECTED_LEAGUE_ORDER = [1, 2, 3, 140, 143, 39, 45, 78, 81, 61, 94, 307, 179];

// Fallback map for slugs that don't have a trailing numeric ID
const SLUG_TO_LEAGUE_ID: Record<string, number> = {
  'la-liga': 140,
  'persian-gulf-pro-league': 179,
};

/**
 * Extract league ID from slug (e.g., "premier-league-39" → 39)
 * Falls back to a known slug map for slugs without numeric suffixes
 */
export function extractLeagueIdFromSlug(slug: string | undefined | null): number | null {
  if (!slug) return null;
  
  // Match trailing number in slug (e.g., "premier-league-39" → "39")
  const match = slug.match(/-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // Fallback for slugs without a numeric suffix
  if (SLUG_TO_LEAGUE_ID[slug] !== undefined) {
    return SLUG_TO_LEAGUE_ID[slug];
  }
  
  return null;
}

/**
 * Get priority for a league (lower = higher priority)
 * Accepts either a slug string or a league ID number
 */
export function getLeaguePriority(slugOrId: string | number | undefined | null): number {
  if (slugOrId === undefined || slugOrId === null) return 999;
  
  let leagueId: number | null = null;
  
  if (typeof slugOrId === 'number') {
    leagueId = slugOrId;
  } else if (typeof slugOrId === 'string') {
    // First try to parse as a direct number (in case it's "39" not "premier-league-39")
    const parsed = parseInt(slugOrId, 10);
    if (!isNaN(parsed) && slugOrId === String(parsed)) {
      leagueId = parsed;
    } else {
      // Extract from slug
      leagueId = extractLeagueIdFromSlug(slugOrId);
    }
  }
  
  if (leagueId !== null && LEAGUE_PRIORITY_ORDER[leagueId] !== undefined) {
    return LEAGUE_PRIORITY_ORDER[leagueId];
  }
  
  return 999; // Unknown leagues go last
}

/**
 * Sort league groups by priority order
 * Generic function that works with any league-grouped data structure
 */
export function sortLeagueGroups<T extends { league: { slug: string; name: string } }>(
  groups: T[]
): T[] {
  return [...groups].sort((a, b) => {
    const priorityA = getLeaguePriority(a.league.slug);
    const priorityB = getLeaguePriority(b.league.slug);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Same priority (both unknown) → sort alphabetically by name
    return a.league.name.localeCompare(b.league.name);
  });
}

/**
 * Sort an array of leagues by priority
 */
export function sortLeagues<T extends { slug: string; name: string }>(leagues: T[]): T[] {
  return [...leagues].sort((a, b) => {
    const priorityA = getLeaguePriority(a.slug);
    const priorityB = getLeaguePriority(b.slug);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Debug helper: log league order with IDs for verification
 */
export function logLeagueOrder(label: string, leagues: Array<{ slug: string; name: string }>): void {
  const ids = leagues.map(l => extractLeagueIdFromSlug(l.slug)).filter(id => id !== null);
  console.log(`[${label}] League ID order:`, ids);
  console.log(`[${label}] Expected order:`, EXPECTED_LEAGUE_ORDER);
  console.log(`[${label}] Matches expected:`, JSON.stringify(ids.slice(0, EXPECTED_LEAGUE_ORDER.length)) === JSON.stringify(EXPECTED_LEAGUE_ORDER.slice(0, ids.length)));
}
