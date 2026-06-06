import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MEALS_PER_DAY = 5;
const STREAK_THRESHOLD = 3; // יום נחשב "על המסלול" לרצף אם בוצעו לפחות 3 ארוחות

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// GET /api/progress?phone=..&from=..&to=..&today=..
// from/to = חודש לתצוגת לוח שנה. today = תאריך מקומי של הלקוח.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const today = searchParams.get("today") ?? new Date().toISOString().slice(0, 10);

  if (!phone) {
    return Response.json({ dailyPct: 0, weeklyPct: 0, streak: 0, mealsDone: 0, mealsSkipped: 0, byDate: {} });
  }

  // חלון רחב לחישוב רצף/שבועי, גם אם הלוח מציג חודש אחר
  const windowFrom = addDays(today, -60);
  const lo = from && from < windowFrom ? from : windowFrom;
  const hi = to && to > today ? to : today;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("meal_completions")
    .select("date, meal_type")
    .eq("user_phone", phone)
    .eq("eaten", true)
    .gte("date", lo)
    .lte("date", hi);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ספירת ארוחות לכל יום
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.date] = (counts[row.date] ?? 0) + 1;

  // byDate מוגבל לטווח התצוגה (from-to)
  const byDate: Record<string, number> = {};
  for (const [d, c] of Object.entries(counts)) {
    if ((!from || d >= from) && (!to || d <= to)) byDate[d] = c;
  }

  const dailyPct = Math.round(((counts[today] ?? 0) / MEALS_PER_DAY) * 100);

  // שבועי — 7 ימים אחרונים כולל היום
  let weekDone = 0;
  for (let i = 0; i < 7; i++) weekDone += counts[addDays(today, -i)] ?? 0;
  const weeklyPct = Math.round((weekDone / (7 * MEALS_PER_DAY)) * 100);

  // רצף — ימים רצופים מעל הסף, מסתיים היום או אתמול
  let streak = 0;
  let cursor = (counts[today] ?? 0) >= STREAK_THRESHOLD ? today : addDays(today, -1);
  while ((counts[cursor] ?? 0) >= STREAK_THRESHOLD) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  // בוצעו/דולגו בטווח התצוגה (רק ימים פעילים נחשבים לדילוג)
  let mealsDone = 0;
  let activeDays = 0;
  for (const c of Object.values(byDate)) {
    mealsDone += c;
    if (c > 0) activeDays++;
  }
  const mealsSkipped = Math.max(0, activeDays * MEALS_PER_DAY - mealsDone);

  return Response.json({ dailyPct, weeklyPct, streak, mealsDone, mealsSkipped, byDate });
}
