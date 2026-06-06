import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/completions?phone=..&date=..            → סימוני היום
// GET /api/completions?phone=..&from=..&to=..       → טווח תאריכים
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!phone) return Response.json({ data: [] });

  const db = supabaseAdmin();
  let q = db.from("meal_completions").select("*").eq("user_phone", phone).eq("eaten", true);
  if (date) q = q.eq("date", date);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);

  const { data, error } = await q;
  if (error) return Response.json({ data: [], error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}

// POST /api/completions → סימון ארוחה כנאכלה (upsert)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_phone, date, meal_type, source = "manual", photo_items = null } = body;
  if (!user_phone || !date || !meal_type) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("meal_completions")
    .upsert(
      { user_phone, date, meal_type, eaten: true, source, photo_items },
      { onConflict: "user_phone,date,meal_type" }
    );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/completions → ביטול סימון ארוחה
export async function DELETE(req: NextRequest) {
  const { user_phone, date, meal_type } = await req.json();
  if (!user_phone || !date || !meal_type) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("meal_completions")
    .delete()
    .eq("user_phone", user_phone)
    .eq("date", date)
    .eq("meal_type", meal_type);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
