// Supabase Upsert Utilities
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import type { League, Team, Fixture, SyncResult } from './types.ts';

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function upsertLeague(
  supabase: SupabaseClient,
  league: League,
  provider: string
): Promise<string | null> {
  const slug = createSlug(league.name);
  
  // Check if league exists by external_id and provider
  const { data: existing } = await supabase
    .from('leagues')
    .select('id')
    .eq('external_id', league.externalId)
    .eq('provider', provider)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('leagues')
      .update({
        name: league.name,
        country: league.country,
        sport: league.sport || 'football',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', (existing as any).id);
    
    if (error) {
      console.error('Error updating league:', error);
      return null;
    }
    return (existing as any).id;
  }

  // Insert new
  const { data, error } = await supabase
    .from('leagues')
    .insert({
      external_id: league.externalId,
      provider,
      name: league.name,
      slug,
      country: league.country,
      sport: league.sport || 'football',
      last_synced_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single();

  if (error) {
    // Handle duplicate slug by appending external ID
    if (error.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('leagues')
        .insert({
          external_id: league.externalId,
          provider,
          name: league.name,
          slug: `${slug}-${league.externalId}`,
          country: league.country,
          sport: league.sport || 'football',
          last_synced_at: new Date().toISOString(),
        } as any)
        .select('id')
        .single();
      
      if (retryError) {
        console.error('Error inserting league:', retryError);
        return null;
      }
      return (retry as any)?.id;
    }
    console.error('Error inserting league:', error);
    return null;
  }
  
  return (data as any)?.id;
}

export async function upsertTeam(
  supabase: SupabaseClient,
  team: Team,
  provider: string,
  leagueId?: string
): Promise<string | null> {
  const slug = createSlug(team.name);

  // Check if team exists by external_id and provider
  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('external_id', team.externalId)
    .eq('provider', provider)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('teams')
      .update({
        name: team.name,
        league_id: leagueId,
        last_synced_at: new Date().toISOString(),
      } as any)
      .eq('id', (existing as any).id);
    
    if (error) {
      console.error('Error updating team:', error);
      return null;
    }
    return (existing as any).id;
  }

  // Insert new
  const { data, error } = await supabase
    .from('teams')
    .insert({
      external_id: team.externalId,
      provider,
      name: team.name,
      slug,
      league_id: leagueId,
      last_synced_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single();

  if (error) {
    // Handle duplicate slug
    if (error.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('teams')
        .insert({
          external_id: team.externalId,
          provider,
          name: team.name,
          slug: `${slug}-${team.externalId}`,
          league_id: leagueId,
          last_synced_at: new Date().toISOString(),
        } as any)
        .select('id')
        .single();
      
      if (retryError) {
        console.error('Error inserting team:', retryError);
        return null;
      }
      return (retry as any)?.id;
    }
    console.error('Error inserting team:', error);
    return null;
  }

  return (data as any)?.id;
}

export async function upsertFixture(
  supabase: SupabaseClient,
  fixture: Fixture,
  provider: string,
  leagueIdMap: Map<string, string>,
  teamIdMap: Map<string, string>
): Promise<string | null> {
  const leagueId = leagueIdMap.get(fixture.leagueExternalId);
  const homeTeamId = teamIdMap.get(fixture.homeTeamExternalId);
  const awayTeamId = teamIdMap.get(fixture.awayTeamExternalId);

  // CRITICAL: All FKs must be set - never insert with NULL league_id
  if (!leagueId) {
    console.error(`Missing league ID for fixture ${fixture.externalId} (leagueExternalId=${fixture.leagueExternalId})`);
    return null;
  }

  if (!homeTeamId || !awayTeamId) {
    console.error(`Missing team IDs for fixture ${fixture.externalId} (home=${fixture.homeTeamExternalId}, away=${fixture.awayTeamExternalId})`);
    return null;
  }

  // Get team names for slug generation
  const { data: homeTeam } = await supabase
    .from('teams')
    .select('name')
    .eq('id', homeTeamId)
    .single();
  
  const { data: awayTeam } = await supabase
    .from('teams')
    .select('name')
    .eq('id', awayTeamId)
    .single();

  const slug = createSlug(`${(homeTeam as any)?.name || 'home'}-vs-${(awayTeam as any)?.name || 'away'}`);

  // Check if fixture exists
  const { data: existing } = await supabase
    .from('fixtures')
    .select('id')
    .eq('external_id', fixture.externalId)
    .eq('provider', provider)
    .maybeSingle();

  const fixtureData = {
    external_id: fixture.externalId,
    provider,
    league_id: leagueId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    kickoff_at: fixture.kickoffAt,
    venue: fixture.venue,
    status: fixture.status,
    season: fixture.season,
    round: fixture.round,
    last_synced_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('fixtures')
      .update(fixtureData as any)
      .eq('id', (existing as any).id);
    
    if (error) {
      console.error('Error updating fixture:', error);
      return null;
    }
    return (existing as any).id;
  }

  // Insert new
  const { data, error } = await supabase
    .from('fixtures')
    .insert({
      ...fixtureData,
      slug,
    } as any)
    .select('id')
    .single();

  if (error) {
    // Handle duplicate slug
    if (error.code === '23505') {
      const timestamp = Date.now().toString(36);
      const { data: retry, error: retryError } = await supabase
        .from('fixtures')
        .insert({
          ...fixtureData,
          slug: `${slug}-${timestamp}`,
        } as any)
        .select('id')
        .single();
      
      if (retryError) {
        console.error('Error inserting fixture:', retryError);
        return null;
      }
      return (retry as any)?.id;
    }
    console.error('Error inserting fixture:', error);
    return null;
  }

  return (data as any)?.id;
}

export async function logSyncRun(
  supabase: SupabaseClient,
  jobType: string,
  provider: string,
  params: Record<string, unknown>,
  result: SyncResult
): Promise<void> {
  await supabase.from('sync_runs').insert({
    job_type: jobType,
    provider,
    params,
    success: result.success,
    upserted_leagues: result.upsertedLeagues,
    upserted_teams: result.upsertedTeams,
    upserted_fixtures: result.upsertedFixtures,
    error: result.error,
  } as any);
}
