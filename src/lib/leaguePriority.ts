/**
 * Shared league priority ordering utility
 * Used across Predictions, Home, Tips, and any league-grouped lists
 * 
 * Priority is based on API-Football league IDs (extracted from slug suffix)
 * Order: UCL → Premier League → La Liga → Serie A → Bundesliga → Ligue 1 → Saudi Pro League → Iran Persian Gulf Pro League
 */

// League priority order by API-Football league ID
// Lower number = higher priority (more important league)
export const LEAGUE_PRIORITY_ORDER: Record<number, number> = {
  2: 1,      // UCL
  39: 2,     // Premier League
  140: 3,    // La Liga
  135: 4,    // Serie A
  78: 5,     // Bundesliga
  61: 6,     // Ligue 1
  307: 7,    // Saudi Pro League
  290: 8,    // Iran Persian Gulf Pro League
};

// The expected order of league IDs for debugging
export const EXPECTED_LEAGUE_ORDER = [2, 39, 140, 135, 78, 61, 307, 290];

/**
 * Extract league ID from slug (e.g., "premier-league-39" → 39)
 * Handles both string slugs and potential external_id fields
 */
export function extractLeagueIdFromSlug(slug: string | undefined | null): number | null {
  if (!slug) return null;
  
  // Match trailing number in slug (e.g., "premier-league-39" → "39")
  const match = slug.match(/-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
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
