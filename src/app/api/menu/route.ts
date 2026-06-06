import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MEAL_ORDER, DAY_NAMES, MealType, DayName } from "@/types";

// GET /api/menu            → { templates, week }  (כל המבנים + תפריט שבועי מלא)
// GET /api/menu?day=ראשון  → DayMenu (מבנה + דוגמת היום לכל ארוחה)
export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const day = new URL(req.url).searchParams.get("day") as DayName | null;

  const [tplRes, exRes, weekRes] = await Promise.all([
    db.from("meal_templates").select("*").order("sort_order"),
    db.from("meal_template_examples").select("*").order("sort_order"),
    db.from("weekly_menu").select("*").order("sort_order"),
  ]);

  if (tplRes.error || weekRes.error) {
    return Response.json(
      { error: tplRes.error?.message ?? weekRes.error?.message },
      { status: 500 }
    );
  }

  const templates = (tplRes.data ?? []).map((t) => ({
    meal_type: t.meal_type as MealType,
    label: t.label,
    required_text: t.required_text,
    required_portions: t.required_portions ?? [],
    examples: (exRes.data ?? [])
      .filter((e) => e.meal_type === t.meal_type)
      .map((e) => e.text),
  }));

  const week = weekRes.data ?? [];

  if (day && DAY_NAMES.includes(day)) {
    const meals = MEAL_ORDER.map((mt) => {
      const tpl = templates.find((t) => t.meal_type === mt);
      const row = week.find((w) => w.day === day && w.meal_type === mt);
      return {
        meal_type: mt,
        label: tpl?.label ?? mt,
        required_text: tpl?.required_text ?? "",
        required_portions: tpl?.required_portions ?? [],
        example: row?.description ?? (tpl?.examples[0] ?? ""),
        calories: row?.calories ?? null,
      };
    });
    return Response.json({ day, meals });
  }

  return Response.json({ templates, week });
}
