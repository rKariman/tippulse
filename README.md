# TipPulse - Football Betting Tips & Predictions

A modern sports betting content and affiliate site built with React, Vite, TailwindCSS, and Supabase.

## Features

- 📊 **Match Predictions** - Expert tips and match previews for major football leagues
- 🎯 **Multiple Markets** - Bet of the Day, Accumulators, BTTS, Correct Score, and more
- 📰 **News & Articles** - Editorial content and betting guides
- 🎁 **Free Bet Offers** - Curated bookmaker promotions with affiliate tracking
- 📧 **Newsletter** - Email subscription for daily tips
- 🔄 **Real-time Data Sync** - Automated match data from Football-Data.org

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: TailwindCSS with custom design system
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Data Source**: Football-Data.org API

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (auto-provisioned via Lovable Cloud)
- Football-Data.org API key (free tier available)

### Environment Variables

The following secrets must be configured in Lovable Cloud:

| Variable | Description |
|----------|-------------|
| `FOOTBALL_DATA_API_KEY` | Your Football-Data.org API key |
| `SYNC_ADMIN_TOKEN` | Admin token for sync endpoints (choose a secure string) |

Optional:
| Variable | Description | Default |
|----------|-------------|---------|
| `MATCH_API_DEFAULT_LEAGUES` | Comma-separated league codes | `PL,CL,SA,PD,BL1` |

### League Codes (Football-Data.org)

- `PL` - Premier League
- `CL` - UEFA Champions League
- `SA` - Serie A
- `PD` - La Liga
- `BL1` - Bundesliga
- `FL1` - Ligue 1
- `PPL` - Primeira Liga
- `DED` - Eredivisie

---

## Data Sync System

### Architecture

The sync system uses a **provider adapter pattern** for flexibility:

```
┌──────────────────────────────────────────────────────┐
│                   Admin Dashboard                     │
│                  /admin/sync                          │
└───────────────────────┬──────────────────────────────┘
                        │ x-sync-token
                        ▼
┌──────────────────────────────────────────────────────┐
│              Supabase Edge Functions                  │
│  ┌─────────────┐ ┌───────────────┐ ┌─────────────┐   │
│  │sync-leagues │ │sync-fixtures  │ │ sync-today  │   │
│  └──────┬──────┘ └───────┬───────┘ └──────┬──────┘   │
│         └────────────────┼────────────────┘          │
│                          ▼                            │
│  ┌───────────────────────────────────────────────┐   │
│  │         Provider Adapter Layer                 │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │  football-data-provider.ts              │  │   │
│  │  │  (implements MatchDataProvider)         │  │   │
│  │  └─────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────┘   │
│                          │                            │
│                          ▼                            │
│  ┌───────────────────────────────────────────────┐   │
│  │              Upsert Layer                      │   │
│  │  upsertLeague() / upsertTeam() / upsertFixture()  │
│  └───────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────┐
│              Supabase Database                        │
│  leagues | teams | fixtures | sync_runs              │
└──────────────────────────────────────────────────────┘
```

### Provider Adapter Interface

To add a new data provider, implement this interface in a new file:

```typescript
interface MatchDataProvider {
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
```

### Manual Sync

1. Navigate to `/admin/sync`
2. Enter your `SYNC_ADMIN_TOKEN`
3. Use the dashboard to:
   - **Sync Today + Tomorrow**: Fetches all default leagues, teams, and today/tomorrow fixtures
   - **Sync Leagues & Teams**: Updates league and team data only
   - **Sync Fixtures**: Custom date range sync with optional league filter

### API Endpoints

All endpoints require `x-sync-token` header.

#### POST /functions/v1/sync-leagues
Sync leagues and teams.

```json
{
  "leagueIds": ["PL", "CL"]  // optional, defaults to MATCH_API_DEFAULT_LEAGUES
}
```

#### POST /functions/v1/sync-fixtures
Sync fixtures for a date range.

```json
{
  "dateFrom": "2026-01-28",
  "dateTo": "2026-01-29",
  "leagueId": "PL"  // optional
}
```

#### POST /functions/v1/sync-today
Sync default leagues + today/tomorrow fixtures. Also accepts GET with `x-cron-token` for scheduled jobs.

---

## Automatic Scheduling (Vercel Cron)

To set up daily automatic sync, add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Then create the cron endpoint that proxies to the Edge Function:

```typescript
// app/api/cron/sync/route.ts (for Next.js)
// or use a Supabase scheduled function

export async function GET(request: Request) {
  const cronToken = process.env.SYNC_ADMIN_TOKEN;
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-today`,
    {
      method: 'GET',
      headers: {
        'x-cron-token': cronToken,
      },
    }
  );
  
  return response;
}
```

For **Supabase scheduled functions**, use pg_cron:

```sql
SELECT cron.schedule(
  'daily-match-sync',
  '0 7 * * *',  -- 07:00 UTC daily
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sync-today',
    headers := '{"x-cron-token": "your-token"}'::jsonb
  );
  $$
);
```

---

## Database Schema

### Extended Tables

The sync system adds these columns to existing tables:

```sql
-- leagues
external_id TEXT        -- Provider's league ID
provider TEXT           -- "football-data"
last_synced_at TIMESTAMPTZ

-- teams  
external_id TEXT        -- Provider's team ID
provider TEXT           -- "football-data"
league_id UUID          -- Reference to leagues
last_synced_at TIMESTAMPTZ

-- fixtures
external_id TEXT        -- Provider's fixture ID
provider TEXT           -- "football-data"
season TEXT             -- e.g., "2025/2026"
round TEXT              -- e.g., "Matchday 20"
last_synced_at TIMESTAMPTZ
```

### Observability Table

```sql
CREATE TABLE sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  job_type TEXT NOT NULL,  -- 'leagues' | 'fixtures' | 'today' | 'cron'
  provider TEXT NOT NULL,
  params JSONB,
  success BOOLEAN NOT NULL,
  upserted_leagues INTEGER DEFAULT 0,
  upserted_teams INTEGER DEFAULT 0,
  upserted_fixtures INTEGER DEFAULT 0,
  error TEXT
);
```

---

## Changing Data Provider

To switch from Football-Data.org to another provider:

1. Create a new provider file in `supabase/functions/_shared/`:
   ```typescript
   // sportmonks-provider.ts
   export function createSportmonksProvider(apiKey: string): MatchDataProvider {
     // Implement all interface methods
   }
   ```

2. Update the edge functions to use the new provider:
   ```typescript
   import { createSportmonksProvider } from '../_shared/sportmonks-provider.ts';
   // ...
   const provider = createSportmonksProvider(apiKey);
   ```

3. Update environment variables accordingly.

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Important Notes

### Editorial Content

**Betting tips and match previews are NOT auto-generated.** The sync system only imports:
- Leagues
- Teams  
- Fixtures (match schedule)

All tips, previews, and articles must be created manually in the database or via an admin interface.

### Rate Limiting

Football-Data.org has rate limits:
- Free tier: 10 requests/minute
- The sync functions include delays between requests
- Retry logic handles 429 responses with backoff

### Responsible Gambling

This site includes mandatory 18+ and responsible gambling disclaimers. Ensure compliance with local regulations before deployment.

---

## License

MIT
