// API-Football.com Provider Implementation
import type { MatchDataProvider, League, Team, Fixture } from './types.ts';

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

interface FetchOptions {
  maxRetries?: number;
  retryDelay?: number;
}

async function fetchWithRetry(
  url: string,
  apiKey: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { maxRetries = 2, retryDelay = 1000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'x-apisports-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

       // Required logging / proof
       console.log(`[api-football] GET ${url} -> ${response.status}`);

      // Handle rate limiting (API-Football uses remaining requests header)
      const remainingRequests = response.headers.get('x-ratelimit-requests-remaining');
      if (remainingRequests && parseInt(remainingRequests, 10) < 5) {
        console.log(`Low on API requests: ${remainingRequests} remaining`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt + 1} failed. Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

function mapStatus(status: string): Fixture['status'] {
  const statusMap: Record<string, Fixture['status']> = {
    TBD: 'scheduled',
    NS: 'scheduled',
    '1H': 'in_play',
    HT: 'in_play',
    '2H': 'in_play',
    ET: 'in_play',
    BT: 'in_play',
    P: 'in_play',
    SUSP: 'postponed',
    INT: 'postponed',
    FT: 'finished',
    AET: 'finished',
    PEN: 'finished',
    PST: 'postponed',
    CANC: 'cancelled',
    ABD: 'cancelled',
    AWD: 'finished',
    WO: 'finished',
    LIVE: 'in_play',
  };
  return statusMap[status] || 'scheduled';
}

export function createApiFootballProvider(apiKey: string): MatchDataProvider {
  return {
    providerName: 'api-football',

    async searchLeagues(query?: string): Promise<League[]> {
      let url = `${API_FOOTBALL_BASE_URL}/leagues`;
      if (query) {
        url += `?search=${encodeURIComponent(query)}`;
      }

      const response = await fetchWithRetry(url, apiKey);
      const data = await response.json();

      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API-Football errors:', data.errors);
        return [];
      }

      return (data.response || []).map((item: any) => ({
        externalId: String(item.league.id),
        name: item.league.name,
        country: item.country?.name,
        sport: 'football',
        emblem: item.league.logo,
      }));
    },

    async getLeague(leagueId: string): Promise<League | null> {
      try {
        const response = await fetchWithRetry(
          `${API_FOOTBALL_BASE_URL}/leagues?id=${leagueId}`,
          apiKey
        );
        const data = await response.json();

        if (data.errors && Object.keys(data.errors).length > 0) {
          console.error('API-Football errors:', data.errors);
          return null;
        }

        const item = data.response?.[0];
        if (!item) return null;

        return {
          externalId: String(item.league.id),
          name: item.league.name,
          country: item.country?.name,
          sport: 'football',
          emblem: item.league.logo,
        };
      } catch {
        return null;
      }
    },

    async getTeamsByLeague(leagueId: string): Promise<Team[]> {
      // API-Football seasons are typically the starting year of the season.
      // For Jan–Jul, European leagues are usually in the previous year season (e.g. Jan 2026 => season 2025).
      const now = new Date();
      const season = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      
      const response = await fetchWithRetry(
        `${API_FOOTBALL_BASE_URL}/teams?league=${leagueId}&season=${season}`,
        apiKey
      );
      const data = await response.json();

      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API-Football errors:', data.errors);
        return [];
      }

      return (data.response || []).map((item: any) => ({
        externalId: String(item.team.id),
        name: item.team.name,
        shortName: item.team.code,
        crest: item.team.logo,
        leagueExternalId: leagueId,
      }));
    },

    async getFixturesByDateRange(params: {
      dateFrom: string;
      dateTo: string;
      leagueId?: string;
    }): Promise<Fixture[]> {
      const { dateFrom, dateTo, leagueId } = params;
      const allFixtures: Fixture[] = [];

      // API-Football requires fetching by single date, so we iterate
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        // Compute season per *target date* (not per "now") to avoid Jan/Feb season drift.
        const season = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
        
        let url = `${API_FOOTBALL_BASE_URL}/fixtures?date=${dateStr}&season=${season}`;
        if (leagueId) {
          url += `&league=${leagueId}`;
        }

        try {
          const response = await fetchWithRetry(url, apiKey);
          const data = await response.json();

          if (data.errors && Object.keys(data.errors).length > 0) {
            console.error('API-Football errors for date', dateStr, ':', data.errors);
            continue;
          }

          const fixtures = (data.response || []).map((m: any) => ({
            externalId: String(m.fixture.id),
            leagueExternalId: String(m.league.id),
            homeTeamExternalId: String(m.teams.home.id),
            awayTeamExternalId: String(m.teams.away.id),
            homeTeamName: m.teams.home.name,
            awayTeamName: m.teams.away.name,
            kickoffAt: m.fixture.date,
            venue: m.fixture.venue?.name,
            status: mapStatus(m.fixture.status?.short || 'NS'),
            season: m.league.season ? `${m.league.season}/${m.league.season + 1}` : undefined,
            round: m.league.round,
            homeScore: m.goals?.home,
            awayScore: m.goals?.away,
          }));

          allFixtures.push(...fixtures);

          // Rate limit pause between date requests
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`Error fetching fixtures for date ${dateStr}:`, err);
        }
      }

      return allFixtures;
    },

    async getFixtureById(fixtureId: string): Promise<Fixture | null> {
      try {
        const response = await fetchWithRetry(
          `${API_FOOTBALL_BASE_URL}/fixtures?id=${fixtureId}`,
          apiKey
        );
        const data = await response.json();

        if (data.errors && Object.keys(data.errors).length > 0) {
          console.error('API-Football errors:', data.errors);
          return null;
        }

        const m = data.response?.[0];
        if (!m) return null;

        return {
          externalId: String(m.fixture.id),
          leagueExternalId: String(m.league.id),
          homeTeamExternalId: String(m.teams.home.id),
          awayTeamExternalId: String(m.teams.away.id),
          kickoffAt: m.fixture.date,
          venue: m.fixture.venue?.name,
          status: mapStatus(m.fixture.status?.short || 'NS'),
          season: m.league.season ? `${m.league.season}/${m.league.season + 1}` : undefined,
          round: m.league.round,
          homeScore: m.goals?.home,
          awayScore: m.goals?.away,
        };
      } catch {
        return null;
      }
    },
  };
}
