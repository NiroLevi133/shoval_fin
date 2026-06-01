import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/stats?phone=...&date_from=...&date_to=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (!phone) return Response.json({ data: [] });

  let query = db()
    .from("daily_summaries")
    .select("date, calories, protein, meal_count")
    .eq("user_phone", phone);

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query.order("date", { ascending: true });
  if (error) return Response.json({ data: [], error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}
