// בונה "ספר ידע" אחד מכל הדאטה התזונתית — מוזרק במלואו ל-AI בכל שיחה.
// מקור אמת יחיד: src/data/nutritionData.ts (אותו קובץ שמזין את ה-seed).
import { FOOD_GROUPS, MEAL_TEMPLATES, WEEKLY_MENU, QNA } from "@/data/nutritionData";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "בוקר", snack1: "ביניים בוקר", lunch: "צהריים", snack2: "ביניים אחה״צ", dinner: "ערב",
};

let cached: string | null = null;

export function buildKnowledgeBase(): string {
  if (cached) return cached;
  const parts: string[] = [];

  // ── חוברת תחליפים ──
  parts.push("# חוברת תחליפים — שר פיטנס (החלף מנה בתחליף שווה ערך מאותה קבוצה בלבד)");
  for (const g of FOOD_GROUPS) {
    parts.push(`\n## ${g.name}${g.note ? ` — ${g.note}` : ""}`);
    for (const it of g.items) parts.push(`${it.isStar ? "★" : "-"} ${it.text}`);
  }

  // ── מבנה הארוחות ──
  parts.push("\n\n# מבנה הארוחות (מה כל ארוחה צריכה להכיל)");
  for (const m of MEAL_TEMPLATES) {
    parts.push(`\n## ${m.label} — נדרש: ${m.required_text}`);
    parts.push("דוגמאות:");
    for (const ex of m.examples) parts.push(`- ${ex}`);
  }

  // ── תפריט שבועי ──
  parts.push("\n\n# תפריט שבועי לדוגמה");
  const byDay = new Map<string, typeof WEEKLY_MENU>();
  for (const r of WEEKLY_MENU) {
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push(r);
  }
  for (const [day, rows] of byDay) {
    parts.push(`\n## יום ${day}`);
    for (const r of rows) {
      parts.push(`- ${MEAL_LABELS[r.meal_type] ?? r.meal_type}: ${r.description}${r.calories ? ` (${r.calories} קק"ל)` : ""}`);
    }
  }

  // ── שאלות ותשובות ──
  parts.push("\n\n# שאלות ותשובות נפוצות");
  for (const q of QNA) {
    parts.push(`\nש: ${q.question}\nת: ${q.answer}`);
  }

  cached = parts.join("\n");
  return cached;
}
