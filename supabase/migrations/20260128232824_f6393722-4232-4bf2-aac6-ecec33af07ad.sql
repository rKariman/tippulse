-- Drop existing primary key if any and make user_id the primary key
-- First check if there's a constraint and drop it
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;

-- Make user_id the primary key (this automatically creates an index)
ALTER TABLE public.admin_users ADD PRIMARY KEY (user_id);

-- Add index on created_at for any time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_users_created_at ON public.admin_users(created_at);