// Football-Data.org Provider Implementation
import type { MatchDataProvider, League, Team, Fixture } from './types.ts';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

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
          'X-Auth-Token': apiKey,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RequestCounter-Reset') || '60';
        const waitTime = parseInt(retryAfter, 10) * 1000;
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
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
    SCHEDULED: 'scheduled',
    TIMED: 'scheduled',
    IN_PLAY: 'in_play',
    PAUSED: 'in_play',
    FINISHED: 'finished',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled',
    SUSPENDED: 'postponed',
  };
  return statusMap[status] || 'scheduled';
}

export function createFootballDataProvider(apiKey: string): MatchDataProvider {
  return {
    providerName: 'football-data',

    async searchLeagues(query?: string): Promise<League[]> {
      const response = await fetchWithRetry(
        `${FOOTBALL_DATA_BASE_URL}/competitions`,
        apiKey
      );
      const data = await response.json();

      let competitions = data.competitions || [];
      
      if (query) {
        const lowerQuery = query.toLowerCase();
        competitions = competitions.filter((c: any) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.area?.name?.toLowerCase().includes(lowerQuery)
        );
      }

      return competitions.map((c: any) => ({
        externalId: String(c.id),
        name: c.name,
        country: c.area?.name,
        sport: 'football',
        emblem: c.emblem,
      }));
    },

    async getLeague(leagueId: string): Promise<League | null> {
      try {
        const response = await fetchWithRetry(
          `${FOOTBALL_DATA_BASE_URL}/competitions/${leagueId}`,
          apiKey
        );
        const c = await response.json();

        return {
          externalId: String(c.id),
          name: c.name,
          country: c.area?.name,
          sport: 'football',
          emblem: c.emblem,
        };
      } catch {
        return null;
      }
    },

    async getTeamsByLeague(leagueId: string): Promise<Team[]> {
      const response = await fetchWithRetry(
        `${FOOTBALL_DATA_BASE_URL}/competitions/${leagueId}/teams`,
        apiKey
      );
      const data = await response.json();

      return (data.teams || []).map((t: any) => ({
        externalId: String(t.id),
        name: t.name,
        shortName: t.shortName || t.tla,
        crest: t.crest,
        leagueExternalId: leagueId,
      }));
    },

    async getFixturesByDateRange(params: {
      dateFrom: string;
      dateTo: string;
      leagueId?: string;
    }): Promise<Fixture[]> {
      const { dateFrom, dateTo, leagueId } = params;
      
      let url = `${FOOTBALL_DATA_BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      
      if (leagueId) {
        url = `${FOOTBALL_DATA_BASE_URL}/competitions/${leagueId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      }

      const response = await fetchWithRetry(url, apiKey);
      const data = await response.json();

      return (data.matches || []).map((m: any) => ({
        externalId: String(m.id),
        leagueExternalId: String(m.competition?.id),
        homeTeamExternalId: String(m.homeTeam?.id),
        awayTeamExternalId: String(m.awayTeam?.id),
        kickoffAt: m.utcDate,
        venue: m.venue,
        status: mapStatus(m.status),
        season: m.season?.startDate ? `${new Date(m.season.startDate).getFullYear()}/${new Date(m.season.endDate).getFullYear()}` : undefined,
        round: m.matchday ? `Matchday ${m.matchday}` : undefined,
        homeScore: m.score?.fullTime?.home,
        awayScore: m.score?.fullTime?.away,
      }));
    },

    async getFixtureById(fixtureId: string): Promise<Fixture | null> {
      try {
        const response = await fetchWithRetry(
          `${FOOTBALL_DATA_BASE_URL}/matches/${fixtureId}`,
          apiKey
        );
        const m = await response.json();

        return {
          externalId: String(m.id),
          leagueExternalId: String(m.competition?.id),
          homeTeamExternalId: String(m.homeTeam?.id),
          awayTeamExternalId: String(m.awayTeam?.id),
          kickoffAt: m.utcDate,
          venue: m.venue,
          status: mapStatus(m.status),
          season: m.season?.startDate ? `${new Date(m.season.startDate).getFullYear()}/${new Date(m.season.endDate).getFullYear()}` : undefined,
          round: m.matchday ? `Matchday ${m.matchday}` : undefined,
          homeScore: m.score?.fullTime?.home,
          awayScore: m.score?.fullTime?.away,
        };
      } catch {
        return null;
      }
    },
  };
}
