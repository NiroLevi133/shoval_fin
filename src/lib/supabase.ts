import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createMockClient() {
  const noOp = async () => ({ data: null, error: null });
  const chainable: Record<string, unknown> = new Proxy({}, {
    get: () => () => chainable,
  });
  return {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ order: noOp, then: noOp }), then: noOp }), then: noOp }), then: noOp }),
      insert: () => ({ select: () => ({ single: noOp }), then: noOp }),
      delete: () => ({ eq: () => ({ eq: () => ({ eq: noOp }), then: noOp }), then: noOp }),
    }),
  };
}

let _supabase: SupabaseClient | ReturnType<typeof createMockClient>;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("⚠️ Supabase credentials not set — running in offline mode (data won't persist)");
  _supabase = createMockClient() as unknown as SupabaseClient;
}

export const supabase = _supabase;
