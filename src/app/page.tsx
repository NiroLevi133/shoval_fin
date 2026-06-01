"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import ProgressRing from "@/components/ProgressRing";
import SubstitutionSheet, { estimateMacros } from "@/components/SubstitutionSheet";
import mealPlanData from "@/data/mealPlan.json";
import { DayPlan, MealKey, FoodLog } from "@/types";
import { CheckCircle2 } from "lucide-react";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MEAL_ORDER: MealKey[] = ["breakfast", "snack1", "lunch", "snack2", "dinner"];

const MOTIVATIONAL = [
  "כל ארוחה היא צעד קדימה 💪",
  "אתה עושה את זה נהדר! 🌟",
  "תזונה טובה = אנרגיה טובה ⚡",
  "יום נוסף, התקדמות נוספת 🎯",
  "הגוף שלך מודה לך על זה 🌱",
];

function getTodayName() {
  return DAY_NAMES[new Date().getDay()];
}
function getHebrewDate() {
  return new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}
function getMotivational() {
  return MOTIVATIONAL[new Date().getDay() % MOTIVATIONAL.length];
}

function localKey(phone: string, date: string) {
  return `fitmeal_logs_${phone}_${date}`;
}
function saveLogs(phone: string, date: string, logs: FoodLog[]) {
  try { localStorage.setItem(localKey(phone, date), JSON.stringify(logs)); } catch {}
}
function loadLogs(phone: string, date: string): FoodLog[] | null {
  try {
    const raw = localStorage.getItem(localKey(phone, date));
    return raw ? (JSON.parse(raw) as FoodLog[]) : null;
  } catch { return null; }
}

// Parse "item1 + item2 + item3" → ["item1", "item2", "item3"]
function parseComponents(description: string): string[] {
  const clean = description.replace(/\n?\(\d+\s*קק"ל\)/g, "").trim();
  return clean
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type SheetState = { mealKey: string; idx: number; component: string } | null;

export default function HomePage() {
  const { user, isLoading, logsVersion } = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [eatenComponents, setEatenComponents] = useState<Map<string, FoodLog>>(new Map());
  const [activeSheet, setActiveSheet] = useState<SheetState>(null);

  const todayName = getTodayName();
  const today = new Date().toISOString().split("T")[0];
  const weeklyPlan = mealPlanData.weeklyPlan as Record<string, DayPlan>;
  const todayPlan = weeklyPlan[todayName] as DayPlan | undefined;

  const calorieTarget = user?.calorie_target ?? 1300;
  const proteinTarget = user?.protein_target ?? 110;
  const carbsTarget = user?.carbs_target ?? 130;
  const fatTarget = user?.fat_target ?? 45;

  const fetchLogs = useCallback(async () => {
    if (!user?.phone) return;
    const { data } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_phone", user.phone)
      .eq("date", today)
      .eq("eaten", true);
    // Prefer Supabase when it has entries; fall back to localStorage for
    // offline/mock mode OR when a previous insert silently failed (DB empty)
    const localData = loadLogs(user.phone, today);
    const logsData: FoodLog[] =
      data && data.length > 0 ? data :
      localData ?? (data ?? []);
    setLogs(logsData);
    const compMap = new Map<string, FoodLog>();
    logsData.forEach((l: FoodLog) => {
      if (l.meal_type.includes(":")) compMap.set(l.meal_type, l);
    });
    setEatenComponents(compMap);
    if (data && data.length > 0) saveLogs(user.phone, today, data);
  }, [user?.phone, today]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) fetchLogs();
  }, [user, isLoading, router, fetchLogs, logsVersion]);

  const selectComponent = async (
    mealKey: string,
    idx: number,
    text: string,
    calories: number,
    protein: number
  ) => {
    if (!user) return;
    const componentKey = `${mealKey}:${idx}`;
    setActiveSheet(null);

    if (eatenComponents.has(componentKey)) {
      // Toggle off
      const updatedLogs = logs.filter((l) => l.meal_type !== componentKey);
      setEatenComponents((prev) => { const m = new Map(prev); m.delete(componentKey); return m; });
      setLogs(updatedLogs);
      saveLogs(user.phone, today, updatedLogs);
      await supabase
        .from("food_logs").delete()
        .eq("user_phone", user.phone).eq("date", today).eq("meal_type", componentKey);
    } else {
      // Delete full-meal entry (avoid double-counting) AND any stale component entry
      await supabase.from("food_logs").delete()
        .eq("user_phone", user.phone).eq("date", today).eq("meal_type", mealKey);
      await supabase.from("food_logs").delete()
        .eq("user_phone", user.phone).eq("date", today).eq("meal_type", componentKey);

      const tempLog: FoodLog = {
        id: crypto.randomUUID(),
        user_phone: user.phone,
        date: today,
        meal_type: componentKey,
        description: text,
        calories,
        protein,
        eaten: true,
        created_at: new Date().toISOString(),
      };
      const updatedLogs = [...logs.filter((l) => l.meal_type !== mealKey), tempLog];
      setEatenComponents((prev) => new Map(prev).set(componentKey, tempLog));
      setLogs(updatedLogs);
      saveLogs(user.phone, today, updatedLogs);

      const { error } = await supabase.from("food_logs").insert({
        user_phone: user.phone, date: today, meal_type: componentKey,
        description: text, calories, protein, eaten: true,
      });
      // On DB error keep the optimistic state — localStorage preserves the selection
      if (error) console.error("Insert error:", error.message);
    }
  };

  // Sum only component-level logs (meal_type contains ":") + any AI-logged full meals
  const consumedCalories = logs.reduce((s, l) => s + (l.calories || 0), 0);
  const consumedProtein = logs.reduce((s, l) => {
    if (l.protein && l.protein > 0) return s + l.protein;
    return s + Math.round((l.calories || 0) * 0.28 / 4);
  }, 0);
  const consumedCarbs = Math.round(consumedCalories * 0.43 / 4);
  const consumedFat = Math.round(consumedCalories * 0.29 / 9);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">{getHebrewDate()}</p>
        <h1 className="text-xl font-bold text-gray-900">שלום, {user.name} 👋</h1>
        <p className="text-sm text-green-600 mt-0.5">{getMotivational()}</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Progress Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">סיכום יומי</h2>
          <div className="flex items-center gap-4">
            <ProgressRing
              value={consumedCalories}
              max={calorieTarget}
              size={110}
              strokeWidth={10}
              color="#16a34a"
              label={`${consumedCalories}`}
              sublabel="קק״ל"
            />
            <div className="flex-1 flex flex-col gap-3">
              <MacroBar label="חלבון" value={Math.round(consumedProtein)} max={proteinTarget} color="bg-blue-500" unit="גר'" />
              <MacroBar label="פחמימות" value={consumedCarbs} max={carbsTarget} color="bg-orange-400" unit="גר'" />
              <MacroBar label="שומן" value={consumedFat} max={fatTarget} color="bg-yellow-400" unit="גר'" />
            </div>
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-400">
            <span>נצרך: {consumedCalories} קק״ל</span>
            <span>נותר: {Math.max(0, calorieTarget - consumedCalories)} קק״ל</span>
          </div>
        </div>

        {/* Today's Meals — Component chips */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">ארוחות היום — {todayName}</h2>
          <div className="flex flex-col gap-5">
            {todayPlan ? MEAL_ORDER.map((mealKey) => {
              const meal = todayPlan[mealKey];
              if (!meal) return null;
              const components = parseComponents(meal.description);
              const eatenCount = components.filter((_, i) => eatenComponents.has(`${mealKey}:${i}`)).length;
              const allEaten = eatenCount === components.length;

              return (
                <div key={mealKey}>
                  {/* Meal header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${allEaten ? "text-green-600" : "text-gray-500"}`}>
                      {meal.label}
                      {allEaten && " ✓"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {eatenCount > 0 && `${eatenCount}/${components.length} • `}
                      {meal.calories} קק״ל
                    </span>
                  </div>

                  {/* Component chips with + separator */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-1.5">
                    {components.map((comp, i) => {
                      const key = `${mealKey}:${i}`;
                      const log = eatenComponents.get(key);
                      const isEaten = !!log;
                      const isSubstituted = isEaten && log.description !== comp;

                      return (
                        <Fragment key={i}>
                          {i > 0 && (
                            <span className="text-gray-300 text-xs font-semibold shrink-0 select-none">
                              +
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (isEaten) {
                                // Toggle off directly
                                selectComponent(mealKey, i, comp, 0, 0);
                              } else {
                                setActiveSheet({ mealKey, idx: i, component: comp });
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all active:scale-95 max-w-[200px] ${
                              isSubstituted
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : isEaten
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            {isEaten && (
                              <CheckCircle2
                                size={13}
                                className={`shrink-0 ${isSubstituted ? "text-blue-500" : "text-green-500"}`}
                              />
                            )}
                            <span className="leading-snug text-right line-clamp-2">
                              {isEaten ? log.description : comp}
                            </span>
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>

                  {/* Hint text */}
                  {!allEaten && (
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      לחץ על רכיב לסימון כנאכל או לבחירת תחליף
                    </p>
                  )}
                </div>
              );
            }) : (
              <p className="text-sm text-gray-400 text-center py-4">אין תפריט ליום זה</p>
            )}
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Substitution Bottom Sheet */}
      {activeSheet && (
        <SubstitutionSheet
          component={activeSheet.component}
          onSelect={(text, calories, protein) =>
            selectComponent(activeSheet.mealKey, activeSheet.idx, text, calories, protein)
          }
          onClose={() => setActiveSheet(null)}
        />
      )}
    </div>
  );
}

function MacroBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className="font-medium">{label}</span>
        <span>{value}/{max} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
