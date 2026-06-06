import { createClient } from "@supabase/supabase-js";

// קליינט צד-שרת עם service role (עוקף RLS). לשימוש ב-API routes בלבד.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
