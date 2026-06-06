import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/measurements?phone=.. → רשימת מדידות (חדש→ישן)
export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get("phone");
  if (!phone) return Response.json({ data: [] });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("measurements")
    .select("*")
    .eq("user_phone", phone)
    .order("date", { ascending: false });
  if (error) return Response.json({ data: [], error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}

// POST /api/measurements → הוספת מדידה
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_phone, date, weight = null, circumferences = null, photo_url = null, note = null } = body;
  if (!user_phone || !date) return Response.json({ error: "missing params" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db
    .from("measurements")
    .insert({ user_phone, date, weight, circumferences, photo_url, note });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/measurements → מחיקה לפי id
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("measurements").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
