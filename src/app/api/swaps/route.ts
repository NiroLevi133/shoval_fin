import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/swaps?phone=..&date=.. → החלפות פריטים של היום
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const date = searchParams.get("date");
  if (!phone || !date) return Response.json({ data: [] });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("meal_item_swaps")
    .select("meal_type, item_index, replacement")
    .eq("user_phone", phone)
    .eq("date", date);
  if (error) return Response.json({ data: [], error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}

// POST /api/swaps → החלפת פריט בתפריט (upsert)
export async function POST(req: NextRequest) {
  const { user_phone, date, meal_type, item_index, replacement } = await req.json();
  if (!user_phone || !date || !meal_type || item_index == null || !replacement) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("meal_item_swaps")
    .upsert(
      { user_phone, date, meal_type, item_index, replacement },
      { onConflict: "user_phone,date,meal_type,item_index" }
    );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/swaps → ביטול החלפה (חזרה למקור)
export async function DELETE(req: NextRequest) {
  const { user_phone, date, meal_type, item_index } = await req.json();
  if (!user_phone || !date || !meal_type || item_index == null) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("meal_item_swaps")
    .delete()
    .eq("user_phone", user_phone)
    .eq("date", date)
    .eq("meal_type", meal_type)
    .eq("item_index", item_index);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
