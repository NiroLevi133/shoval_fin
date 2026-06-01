import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function recalcSummary(supabase: SupabaseClient, phone: string, date: string) {
  const { data } = await supabase
    .from("food_logs")
    .select("calories, protein, meal_type")
    .eq("user_phone", phone)
    .eq("date", date)
    .eq("eaten", true);

  if (!data) return;

  let calories = 0, protein = 0, mealCount = 0;
  for (const row of data) {
    if (row.calories === 0 && !row.meal_type?.includes(":")) continue;
    calories += row.calories || 0;
    const rowProtein = row.protein && row.protein > 0
      ? row.protein
      : Math.round((row.calories || 0) * 0.28 / 4);
    protein += rowProtein;
    mealCount += 1;
  }

  await supabase.from("daily_summaries").upsert(
    { user_phone: phone, date, calories, protein, meal_count: mealCount, updated_at: new Date().toISOString() },
    { onConflict: "user_phone,date" }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const eaten = searchParams.get("eaten");

  if (!phone) return Response.json({ data: [] });

  const supabase = db();
  let query = supabase.from("food_logs").select("*").eq("user_phone", phone);

  if (date) query = query.eq("date", date);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (eaten === "true") query = query.eq("eaten", true);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) {
    console.error("[GET /api/logs] Supabase error:", error.message, error.details, error.hint);
    return Response.json({ data: [], error: error.message }, { status: 500 });
  }
  return Response.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const entry = await req.json();
  const supabase = db();
  const { error } = await supabase.from("food_logs").insert(entry);
  if (error) {
    console.error("[POST /api/logs] Supabase error:", error.message, error.details, error.hint);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (entry.eaten && entry.user_phone && entry.date) {
    await recalcSummary(supabase, entry.user_phone, entry.date);
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json() as { id?: string; phone?: string; date?: string; meal_type?: string };
  const supabase = db();

  if (body.id) {
    const { data: row } = await supabase
      .from("food_logs").select("user_phone, date").eq("id", body.id).single();
    await supabase.from("food_logs").delete().eq("id", body.id);
    if (row) await recalcSummary(supabase, row.user_phone, row.date);
    return Response.json({ ok: true });
  }

  if (body.phone && body.date && body.meal_type !== undefined) {
    await supabase
      .from("food_logs").delete()
      .eq("user_phone", body.phone).eq("date", body.date).eq("meal_type", body.meal_type);
    await recalcSummary(supabase, body.phone, body.date);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid params" }, { status: 400 });
}
