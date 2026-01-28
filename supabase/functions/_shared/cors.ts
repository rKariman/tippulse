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

export function validateCronToken(req: Request): boolean {
  const cronToken = req.headers.get('x-cron-token');
  const expectedToken = Deno.env.get('SYNC_ADMIN_TOKEN'); // Reuse same token for cron
  
  if (!expectedToken) {
    console.error('SYNC_ADMIN_TOKEN not configured for cron');
    return false;
  }
  
  return cronToken === expectedToken;
}
