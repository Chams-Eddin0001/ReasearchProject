import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

/**
 * Supabase admin client with service role key
 * This client bypasses Row Level Security (RLS) policies
 * 
 * SECURITY WARNING: Only use this on the server-side in API routes!
 * Never expose this client to the client-side code.
 * 
 * Use Cases:
 * - Creating records when using third-party auth (like Clerk)
 * - Admin operations that need to bypass RLS
 * - Batch operations that require elevated permissions
 * 
 * Always validate user authentication (via Clerk) before performing operations.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
