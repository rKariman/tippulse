# TipPulse — Step-by-Step Self-Hosting Guide

A concise checklist to get TipPulse running on your own Linux server with a custom domain, Supabase backend, and Nginx reverse proxy.

---

## 1. Prerequisites

- **Server**: Ubuntu 22.04+ with root/sudo access
- **Domain**: A domain name (e.g., `tippulse.com`) with DNS access
- **Supabase account**: Free tier is fine — [supabase.com](https://supabase.com)
- **API keys ready**:
  - API-Football key ([api-football.com](https://www.api-football.com/))
  - OpenAI API key ([platform.openai.com](https://platform.openai.com/))

---

## 2. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Verify
node --version   # v20.x.x
nginx -v         # nginx/1.x.x
```

---

## 3. Get the Code from GitHub

```bash
# Clone your synced repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /var/www/tippulse
cd /var/www/tippulse
```

---

## 4. Create the `.env` File

```bash
cp .env.example .env
nano .env
```

Fill in these values (get them from Supabase Dashboard → Settings → API):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_PLACE_BET_BASE_URL=https://your-affiliate-link.com/bet
```

---

## 5. Build the App

```bash
cd /var/www/tippulse

# Install dependencies
npm ci --legacy-peer-deps

# Build for production
npm run build

# Verify dist/ was created
ls dist/index.html
```

---

## 6. Set Up Supabase Database

### 6a. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**, choose a name and region
3. Note your **Project URL**, **anon key**, and **service role key**

### 6b. Run the Schema Migrations

Option A — **Via Supabase CLI** (recommended):

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Push all migrations
supabase db push
```

Option B — **Via SQL Editor** in Supabase Dashboard:

1. Go to SQL Editor in your Supabase dashboard
2. Copy and run each file from `supabase/migrations/` in order (sorted by filename)
3. This creates all tables, RLS policies, and functions

### 6c. Verify Tables Exist

After migrations, you should have these tables:
- `leagues`, `teams`, `fixtures`
- `match_tips`, `player_tips`, `ai_tips_cache`
- `tips`, `previews`, `preview_tips`
- `articles`, `news_posts`, `free_bets`, `offers`, `bookmakers`
- `subscribers`, `outbound_clicks`
- `sync_runs`, `tip_generation_runs`
- `admin_users`

### 6d. Add Yourself as Admin

```sql
-- In Supabase SQL Editor, after signing up via the app:
INSERT INTO admin_users (user_id)
VALUES ('YOUR_AUTH_USER_UUID');
```

---

## 7. Deploy Edge Functions

```bash
cd /var/www/tippulse

# Deploy all functions
supabase functions deploy sync-today
supabase functions deploy sync-fixtures
supabase functions deploy sync-leagues
supabase functions deploy sync-live
supabase functions deploy ensure-tips
supabase functions deploy warm-tips-cache
```

---

## 8. Set Supabase Secrets

```bash
supabase secrets set API_FOOTBALL_KEY=your-api-football-key
supabase secrets set OPENAI_API_KEY=your-openai-api-key
supabase secrets set SYNC_ADMIN_TOKEN=choose-a-secure-random-string
supabase secrets set MATCH_DEFAULT_LEAGUE_IDS=39,2,135,140,78
```

> **Self-hosted Supabase?** If your dashboard blocks `SUPABASE_*` names, use:
> ```bash
> supabase secrets set SB_URL=https://your-project.supabase.co
> supabase secrets set SB_SERVICE_ROLE_KEY=your-service-role-key
> ```
> The edge functions automatically fall back to these names.

---

## 9. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/tippulse
```

Paste this config:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/tippulse/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets (hashed filenames)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/tippulse /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Point Your Domain

1. Go to your domain registrar (Namecheap, Cloudflare, etc.)
2. Create an **A record**: `your-domain.com` → `YOUR_SERVER_IP`
3. Create an **A record**: `www.your-domain.com` → `YOUR_SERVER_IP`
4. Wait for DNS propagation (5–30 minutes)

---

## 11. Enable HTTPS with Certbot

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot will:
- Obtain a free Let's Encrypt certificate
- Auto-modify your Nginx config for HTTPS + redirect
- Set up auto-renewal

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

---

## 12. Set File Permissions

```bash
sudo chown -R www-data:www-data /var/www/tippulse/dist
chmod 600 /var/www/tippulse/.env
```

---

## 13. Initial Data Sync

Trigger the first sync to populate leagues, teams, and fixtures:

```bash
# Sync leagues and teams
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-leagues \
  -H "Content-Type: application/json" \
  -H "x-sync-token: YOUR_SYNC_ADMIN_TOKEN"

# Sync today's fixtures
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-today \
  -H "Content-Type: application/json" \
  -H "x-sync-token: YOUR_SYNC_ADMIN_TOKEN"

# Generate tips for upcoming matches
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/ensure-tips \
  -H "Content-Type: application/json" \
  -H "x-sync-token: YOUR_SYNC_ADMIN_TOKEN"
```

---

## 14. Set Up Automated Syncing (Optional)

Add cron jobs for daily syncing:

```bash
crontab -e
```

```cron
# Sync today's fixtures every morning at 6 AM
0 6 * * * curl -s -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-today -H "x-sync-token: YOUR_TOKEN" > /dev/null

# Generate tips at 7 AM
0 7 * * * curl -s -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/ensure-tips -H "x-sync-token: YOUR_TOKEN" > /dev/null

# Sync live scores every 2 minutes during match hours (12-23 UTC)
*/2 12-23 * * * curl -s -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-live -H "x-cron-token: YOUR_TOKEN" > /dev/null
```

---

## 15. Verify Everything Works

- [ ] Visit `https://your-domain.com` — homepage loads
- [ ] Navigate to `/predictions` — fixtures appear
- [ ] Click a match — tips display correctly
- [ ] Check `/admin` — admin panel accessible (after logging in)
- [ ] Run sync-today — new fixtures appear
- [ ] Delete an old fixture — CASCADE removes related tips automatically

---

## 16. Updating the App

When you push changes to GitHub:

```bash
cd /var/www/tippulse
git pull origin main
npm ci --legacy-peer-deps
npm run build
sudo chown -R www-data:www-data dist/
```

Nginx serves the new files automatically — no restart needed.

---

## Quick Reference

| Item | Value |
|------|-------|
| App location | `/var/www/tippulse/dist` |
| Nginx config | `/etc/nginx/sites-available/tippulse` |
| Env file | `/var/www/tippulse/.env` |
| Nginx logs | `/var/log/nginx/access.log`, `error.log` |
| SSL certs | `/etc/letsencrypt/live/your-domain.com/` |
| Deploy functions | `supabase functions deploy <name>` |
| Set secrets | `supabase secrets set KEY=value` |

---

*Generated: February 2026*
