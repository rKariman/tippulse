// Match Data Provider Types

export interface League {
  externalId: string;
  name: string;
  country?: string;
  sport?: string;
  emblem?: string;
}

export interface Team {
  externalId: string;
  name: string;
  shortName?: string;
  crest?: string;
  leagueExternalId?: string;
}

export interface Fixture {
  externalId: string;
  leagueExternalId: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  kickoffAt: string;
  venue?: string;
  status: 'scheduled' | 'in_play' | 'finished' | 'postponed' | 'cancelled';
  season?: string;
  round?: string;
  homeScore?: number;
  awayScore?: number;
}

export interface MatchDataProvider {
  providerName: string;
  searchLeagues(query?: string): Promise<League[]>;
  getLeague(leagueId: string): Promise<League | null>;
  getTeamsByLeague(leagueId: string): Promise<Team[]>;
  getFixturesByDateRange(params: {
    dateFrom: string;
    dateTo: string;
    leagueId?: string;
  }): Promise<Fixture[]>;
  getFixtureById(fixtureId: string): Promise<Fixture | null>;
}

export interface SyncResult {
  success: boolean;
  upsertedLeagues: number;
  upsertedTeams: number;
  upsertedFixtures: number;
  error?: string;
}
