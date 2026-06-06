// scripts/seed.ts — שתילת כל התוכן ל-Supabase.
// הרצה:  npx tsx scripts/seed.ts
// דרישות: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL ב-.env.local,
//          והפעלת schema.sql ב-Supabase.
// הערה: ה-AI קורא את כל הידע ישירות (src/lib/knowledge.ts) — אין צורך ב-embeddings.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  FOOD_GROUPS,
  MEAL_TEMPLATES,
  WEEKLY_MENU,
  QNA,
} from "../src/data/nutritionData";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── טעינת .env.local ידנית ─────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("חסר NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY ב-.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function clearTables() {
  // ניקוי תוכן ישן (idempotent). לא נוגע בטבלאות משתמש.
  const tables = [
    "substitution_items",
    "food_groups",
    "meal_template_examples",
    "meal_templates",
    "weekly_menu",
    "qna",
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().gte("id", 0);
    if (error) console.warn(`  אזהרה בניקוי ${t}: ${error.message}`);
  }
}

async function main() {
  console.log("🌱 מתחיל seed...");
  await clearTables();

  // ── קבוצות מזון + תחליפים ──
  console.log("• קבוצות מזון ותחליפים");
  for (let gi = 0; gi < FOOD_GROUPS.length; gi++) {
    const g = FOOD_GROUPS[gi];
    const { data: grp, error } = await supabase
      .from("food_groups")
      .insert({ key: g.key, name: g.name, note: g.note ?? null, sort_order: gi })
      .select("id")
      .single();
    if (error || !grp) throw new Error(`food_groups ${g.key}: ${error?.message}`);

    const items = g.items.map((it, i) => ({
      group_id: grp.id,
      text: it.text,
      is_star: !!it.isStar,
      sort_order: i,
    }));
    const { error: itErr } = await supabase.from("substitution_items").insert(items);
    if (itErr) throw new Error(`substitution_items ${g.key}: ${itErr.message}`);
  }

  // ── מבנה הארוחות + דוגמאות ──
  console.log("• מבנה ארוחות");
  for (let mi = 0; mi < MEAL_TEMPLATES.length; mi++) {
    const m = MEAL_TEMPLATES[mi];
    const { error } = await supabase.from("meal_templates").insert({
      meal_type: m.meal_type,
      label: m.label,
      required_text: m.required_text,
      required_portions: m.required_portions,
      sort_order: mi,
    });
    if (error) throw new Error(`meal_templates ${m.meal_type}: ${error.message}`);

    const examples = m.examples.map((text, i) => ({ meal_type: m.meal_type, text, sort_order: i }));
    const { error: exErr } = await supabase.from("meal_template_examples").insert(examples);
    if (exErr) throw new Error(`meal_template_examples ${m.meal_type}: ${exErr.message}`);
  }

  // ── תפריט שבועי ──
  console.log("• תפריט שבועי");
  const weeklyRows = WEEKLY_MENU.map((r, i) => ({ ...r, sort_order: i }));
  const { error: wErr } = await supabase.from("weekly_menu").insert(weeklyRows);
  if (wErr) throw new Error(`weekly_menu: ${wErr.message}`);

  // ── שאלות ותשובות ──
  console.log("• שאלות ותשובות");
  const qnaRows = QNA.map((q, i) => ({ question: q.question, answer: q.answer, sort_order: i }));
  const { error: qErr } = await supabase.from("qna").insert(qnaRows);
  if (qErr) throw new Error(`qna: ${qErr.message}`);

  console.log("✅ seed הושלם בהצלחה!");
  console.log(`   קבוצות: ${FOOD_GROUPS.length} · ארוחות: ${MEAL_TEMPLATES.length} · תפריט: ${WEEKLY_MENU.length} שורות · שו"ת: ${QNA.length}`);
}

main().catch((e) => {
  console.error("❌ seed נכשל:", e.message);
  process.exit(1);
});
