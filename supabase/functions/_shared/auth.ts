// Shared admin-guard helper for Edge Functions.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export type AdminContext = {
  supabase: SupabaseClient;
  userId: string;
  isAdmin: boolean;
};

export async function getAuthContext(req: Request): Promise<AdminContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const isAdmin = Boolean((data.user.app_metadata as any)?.is_admin);
  return { supabase, userId: data.user.id, isAdmin };
}
