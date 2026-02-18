export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token, x-cron-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function validateAdminToken(req: Request): boolean {
  const syncToken = req.headers.get('x-sync-token');
  const expectedToken = Deno.env.get('SYNC_ADMIN_TOKEN');
  
  if (!expectedToken) {
    console.error('SYNC_ADMIN_TOKEN not configured');
    return false;
  }
  
  return syncToken === expectedToken;
}

// Helper to get env vars with fallback names (for self-hosted Supabase where SUPABASE_* may be restricted)
export function getSupabaseUrl(): string {
  return Deno.env.get('SUPABASE_URL') || Deno.env.get('SB_URL') || '';
}

export function getSupabaseServiceRoleKey(): string {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || '';
}

export function validateCronToken(req: Request): boolean {
  // Check x-cron-token header
  const cronToken = req.headers.get('x-cron-token');
  const expectedToken = Deno.env.get('SYNC_ADMIN_TOKEN');
  
  if (cronToken && expectedToken && cronToken === expectedToken) {
    return true;
  }
  
  // Also accept service role key in Authorization header (for pg_cron)
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = getSupabaseServiceRoleKey();
  
  if (authHeader && serviceRoleKey) {
    const token = authHeader.replace('Bearer ', '');
    if (token === serviceRoleKey) {
      return true;
    }
  }
  
  return false;
}
