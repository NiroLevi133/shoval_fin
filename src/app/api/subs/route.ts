import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/subs → קבוצות מזון עם פריטי התחליפים (דינמי מה-DB)
export async function GET() {
  const db = supabaseAdmin();
  const [groupsRes, itemsRes] = await Promise.all([
    db.from("food_groups").select("*").order("sort_order"),
    db.from("substitution_items").select("*").order("sort_order"),
  ]);

  if (groupsRes.error) {
    return Response.json({ error: groupsRes.error.message, groups: [] }, { status: 500 });
  }

  const items = itemsRes.data ?? [];
  const groups = (groupsRes.data ?? []).map((g) => ({
    ...g,
    items: items.filter((it) => it.group_id === g.id),
  }));

  return Response.json({ groups });
}
