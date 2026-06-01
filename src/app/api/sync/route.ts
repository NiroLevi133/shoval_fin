import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FoodLog } from "@/types";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/sync
// Body: { phone, logs: FoodLog[] }
// For each date in the logs, if DB has no data → insert all entries for that date.
export async function POST(req: NextRequest) {
  const { phone, logs } = await req.json() as { phone: string; logs: FoodLog[] };
  if (!phone || !logs?.length) return Response.json({ synced: 0 });

  // Group by date
  const byDate: Record<string, FoodLog[]> = {};
  for (const log of logs) {
    if (!byDate[log.date]) byDate[log.date] = [];
    byDate[log.date].push(log);
  }

  let synced = 0;
  for (const [date, entries] of Object.entries(byDate)) {
    // Check if DB already has data for this date
    const { data: existing } = await db()
      .from("food_logs")
      .select("id")
      .eq("user_phone", phone)
      .eq("date", date)
      .limit(1);

    if (existing && existing.length > 0) continue; // already in DB

    // Insert all entries for this date
    const rows = entries.map(({ id: _id, ...rest }) => ({ ...rest, user_phone: phone }));
    const { error } = await db().from("food_logs").insert(rows);
    if (!error) synced += entries.length;
  }

  return Response.json({ synced });
}
