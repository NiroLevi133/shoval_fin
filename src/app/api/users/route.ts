import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/users?phone=.. → פרופיל משתמש
export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get("phone");
  if (!phone) return Response.json({ user: null });
  const db = supabaseAdmin();
  const { data } = await db.from("users").select("*").eq("phone", phone).maybeSingle();
  return Response.json({ user: data ?? null });
}

// POST /api/users → יצירה/עדכון פרופיל (upsert לפי טלפון)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, gender = null, age = null, weight = null, height = null, goal = null } = body;
  if (!name || !phone) return Response.json({ error: "missing name/phone" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("users")
    .upsert(
      { phone, name, gender, age, weight, height, goal, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
