# TipPulse - Linux Self-Hosting Guide

This guide covers deploying TipPulse on your own Linux server. This is a **Vite/React SPA** (static site) with a Supabase backend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting the Code](#getting-the-code)
3. [Environment Setup](#environment-setup)
4. [Building the Application](#building-the-application)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL with Certbot](#ssl-with-certbot)
7. [Edge Functions Deployment](#edge-functions-deployment)
8. [Deployment Checklist](#deployment-checklist)
9. [Health Checks & Monitoring](#health-checks--monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS (or Debian 11+)
- **RAM**: 1GB minimum (2GB recommended)
- **Disk**: 10GB free space
- **Node.js**: v18.x or v20.x LTS

### Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install build essentials (for native modules)
sudo apt install -y build-essential
```

---

## Getting the Code

### Option A: Download from Lovable

1. In Lovable, go to **Settings → GitHub** and connect your GitHub account
2. Push the project to your GitHub repository
3. On your server:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /var/www/tippulse
cd /var/www/tippulse
```

### Option B: Manual File Transfer

1. In Lovable, switch to **Code View** (top-left toggle)
2. Use the file browser to download files or copy content
3. Transfer to your server via SCP/SFTP:

```bash
# From your local machine
scp -r ./project-folder user@your-server:/var/www/tippulse
```

### Required Files/Folders

Ensure these are present:

```
/var/www/tippulse/
├── src/                    # Application source code
├── public/                 # Static assets
├── supabase/               # Edge functions & config
│   ├── functions/          # Serverless functions
│   └── config.toml         # Supabase configuration
├── package.json            # Dependencies
├── package-lock.json       # Lock file
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── index.html              # Entry HTML
└── .env.example            # Environment template
```

---

## Environment Setup

### Create Environment File

```bash
cd /var/www/tippulse

# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | `eyJhbGciOiJIUzI1...` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | `abc123` |
| `VITE_PLACE_BET_BASE_URL` | Affiliate link base URL | `https://betting-site.com/bet` |

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings → API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project Reference ID** (from URL) → `VITE_SUPABASE_PROJECT_ID`

---

## Building the Application

```bash
cd /var/www/tippulse

# Install dependencies
npm ci --legacy-peer-deps

# Build for production
npm run build

# The built files will be in ./dist/
ls -la dist/
```

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── favicon.ico
```

---

## Nginx Configuration

### Create Site Configuration

```bash
sudo nano /etc/nginx/sites-available/tippulse
```

### Nginx Config (HTTP only - for initial setup)

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/tippulse/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

### Enable the Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/tippulse /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL with Certbot

### Obtain SSL Certificate

```bash
# Make sure DNS is pointing to your server first!
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Certbot will:

1. Automatically modify your Nginx config for HTTPS
2. Set up auto-renewal (check with `sudo certbot renew --dry-run`)

### Final Nginx Config (after Certbot)

Certbot will modify your config. The result should look like:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    root /var/www/tippulse/dist;
    index index.html;
    
    # ... rest of config (gzip, security headers, etc.)
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Edge Functions Deployment

Edge Functions run on Supabase's infrastructure, not your server. To deploy them:

### Install Supabase CLI

```bash
# Install via npm
npm install -g supabase

# Or via Homebrew (if on macOS)
brew install supabase/tap/supabase
```

### Login and Link Project

```bash
cd /var/www/tippulse

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID
```

### Deploy Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy sync-today
supabase functions deploy sync-fixtures
supabase functions deploy sync-leagues
supabase functions deploy sync-live
supabase functions deploy ensure-tips
supabase functions deploy generate-tips
supabase functions deploy warm-tips-cache
```

### Set Edge Function Secrets

```bash
# Set required secrets
supabase secrets set API_FOOTBALL_KEY=your-api-key
supabase secrets set SYNC_ADMIN_TOKEN=your-secure-token
supabase secrets set FOOTBALL_DATA_API_KEY=your-football-data-key
supabase secrets set MATCH_DEFAULT_LEAGUE_IDS=39,2,135,140,78
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Domain DNS A record points to server IP
- [ ] Supabase project created and configured
- [ ] Database tables and RLS policies migrated
- [ ] All environment variables documented

### Server Setup

- [ ] Node.js 18+ installed
- [ ] Nginx installed and running
- [ ] Firewall allows ports 80 and 443

### Application

- [ ] Code transferred to `/var/www/tippulse`
- [ ] `.env` file created with correct values
- [ ] Dependencies installed (`npm ci`)
- [ ] Production build completed (`npm run build`)
- [ ] `dist/` folder contains built files

### Nginx & SSL

- [ ] Nginx site config created
- [ ] Site enabled (symlinked)
- [ ] Nginx config test passes (`nginx -t`)
- [ ] SSL certificate obtained
- [ ] HTTPS redirect working

### Edge Functions

- [ ] Supabase CLI installed
- [ ] Project linked
- [ ] All functions deployed
- [ ] Secrets configured

### Post-Deployment

- [ ] Site accessible via HTTPS
- [ ] All pages load correctly
- [ ] API calls to Supabase working
- [ ] Admin sync functions tested

---

## Health Checks & Monitoring

### Basic Health Check

```bash
# Check if site responds
curl -I https://your-domain.com

# Expected: HTTP/2 200
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### Check Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Monitor SSL Certificate

```bash
# Check certificate expiry
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

### Simple Monitoring Script

```bash
#!/bin/bash
# save as /usr/local/bin/check-tippulse.sh

SITE_URL="https://your-domain.com"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $SITE_URL)

if [ "$RESPONSE" != "200" ]; then
    echo "$(date): Site down! HTTP $RESPONSE" >> /var/log/tippulse-monitor.log
    # Optionally send alert email or Slack notification
fi
```

Add to crontab for regular checks:

```bash
# Run every 5 minutes
*/5 * * * * /usr/local/bin/check-tippulse.sh
```

---

## Troubleshooting

### Common Errors

#### 1. "Module not found" during build

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Nginx 403 Forbidden

```bash
# Check file permissions
sudo chown -R www-data:www-data /var/www/tippulse/dist
sudo chmod -R 755 /var/www/tippulse/dist
```

#### 3. SPA routes return 404

Ensure Nginx has the `try_files` directive:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

#### 4. Supabase connection fails

1. Check `.env` values are correct
2. Verify Supabase project is active
3. Check browser console for CORS errors
4. Ensure anon key has correct permissions

#### 5. SSL certificate errors

```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

#### 6. "Permission denied" for edge function secrets

Make sure you're logged in with the correct Supabase account:
```bash
supabase logout
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

### Debug Mode

To run a development server for debugging:

```bash
cd /var/www/tippulse
npm run dev -- --host 0.0.0.0
```

Access at `http://your-server-ip:8080` (remember to open firewall temporarily).

---

## Updating the Application

### Manual Update Process

```bash
cd /var/www/tippulse

# Pull latest code (if using Git)
git pull origin main

# Install any new dependencies
npm ci --legacy-peer-deps

# Rebuild
npm run build

# Nginx automatically serves new files from dist/
```

### Automated Deployment Script

```bash
#!/bin/bash
# save as /usr/local/bin/deploy-tippulse.sh

set -e

cd /var/www/tippulse

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm ci --legacy-peer-deps

echo "Building application..."
npm run build

echo "Setting permissions..."
sudo chown -R www-data:www-data dist/

echo "Deployment complete!"
```

---

## File Permissions Summary

```bash
# Set ownership
sudo chown -R $USER:$USER /var/www/tippulse
sudo chown -R www-data:www-data /var/www/tippulse/dist

# Set permissions
chmod -R 755 /var/www/tippulse
chmod 600 /var/www/tippulse/.env
```

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev/
- **Nginx Docs**: https://nginx.org/en/docs/

---

*Last updated: January 2026*
