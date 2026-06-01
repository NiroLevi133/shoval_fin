import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const date = searchParams.get("date");
  const eaten = searchParams.get("eaten");

  if (!phone || !date) return Response.json({ data: [] });

  let query = db()
    .from("food_logs")
    .select("*")
    .eq("user_phone", phone)
    .eq("date", date);

  if (eaten === "true") query = query.eq("eaten", true);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) return Response.json({ data: [] }, { status: 500 });
  return Response.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const entry = await req.json();
  const { error } = await db().from("food_logs").insert(entry);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json() as { id?: string; phone?: string; date?: string; meal_type?: string };

  if (body.id) {
    await db().from("food_logs").delete().eq("id", body.id);
    return Response.json({ ok: true });
  }

  if (body.phone && body.date && body.meal_type !== undefined) {
    await db()
      .from("food_logs")
      .delete()
      .eq("user_phone", body.phone)
      .eq("date", body.date)
      .eq("meal_type", body.meal_type);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid params" }, { status: 400 });
}
