"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import ProgressRing from "@/components/ProgressRing";
import SubstitutionSheet, { estimateMacros } from "@/components/SubstitutionSheet";
import ScanResultSheet from "@/components/ScanResultSheet";
import mealPlanData from "@/data/mealPlan.json";
import { DayPlan, MealKey, FoodLog } from "@/types";
import { CheckCircle2, Camera } from "lucide-react";

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    mealKey: string;
    mealLabel: string;
    components: Array<{ text: string; calories: number; protein: number }>;
  } | null>(null);

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
      supabase.from("food_logs").delete()
        .eq("user_phone", user.phone).eq("date", today).eq("meal_type", componentKey);
    } else {
      // Optimistic update first — chip turns green immediately
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
      setSaveError(null);

      // Sync to DB in background — localStorage is source of truth, no rollback on failure
      supabase.from("food_logs").delete()
        .eq("user_phone", user.phone).eq("date", today).eq("meal_type", mealKey).then(() => {
          supabase.from("food_logs").delete()
            .eq("user_phone", user.phone).eq("date", today).eq("meal_type", componentKey).then(() => {
              supabase.from("food_logs").insert({
                user_phone: user.phone, date: today, meal_type: componentKey,
                description: text, calories, protein, eaten: true,
              });
            });
        });
    }
  };

  const handleScanImage = async (mealKey: string, mealLabel: string, file: File) => {
    setScanning(mealKey);
    try {
      const resized = await resizeImage(file, 720);
      const base64 = resized.split(",")[1];
      const mimeType = file.type;
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, mealLabel }),
      });
      const data = await res.json() as { components: Array<{ text: string; calories: number; protein: number }> };
      setScanResult({ mealKey, mealLabel, components: data.components });
    } catch {
      setSaveError("שגיאה בסריקת התמונה");
    }
    setScanning(null);
  };

  const handleScanConfirm = async (components: Array<{ text: string; calories: number; protein: number }>) => {
    if (!scanResult || !user) return;
    const { mealKey } = scanResult;
    setScanResult(null);
    for (let i = 0; i < components.length; i++) {
      await selectComponent(mealKey, i, components[i].text, components[i].calories, components[i].protein);
    }
  };

  // Custom entries (manual food log + AI-added custom items)
  const extraLogs = logs.filter((l) => l.meal_type === "custom" || l.meal_type.startsWith("custom:"));

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
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-red-600">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-red-400 text-xs ml-2">✕</button>
        </div>
      )}
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

              // Collect any extra AI-added chips beyond the plan's component count
              const extraAiIndices: number[] = [];
              for (let x = components.length; eatenComponents.has(`${mealKey}:${x}`); x++) {
                extraAiIndices.push(x);
              }

              const totalChips = components.length + extraAiIndices.length;
              const eatenCount = Array.from({ length: totalChips }, (_, i) => i)
                .filter((i) => eatenComponents.has(`${mealKey}:${i}`)).length;
              const allEaten = eatenCount === totalChips && totalChips > 0;

              // AI updated this meal only if a marker entry (meal_type === mealKey, no colon) exists.
              // Manual chip substitutions don't create a marker, so their sibling chips stay visible.
              const isAiUpdated = logs.some((l) => l.meal_type === mealKey);

              return (
                <div key={mealKey}>
                  {/* Meal header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${allEaten ? "text-green-600" : "text-gray-500"}`}>
                      {meal.label}
                      {allEaten && " ✓"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">
                        {eatenCount > 0 && `${eatenCount}/${components.length} • `}
                        {meal.calories} קק״ל
                      </span>
                      {/* Camera button */}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleScanImage(mealKey, meal.label, file);
                            e.target.value = "";
                          }}
                        />
                        {scanning === mealKey ? (
                          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-6 h-6 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center active:scale-95 transition-transform">
                            <Camera size={12} className="text-purple-500" />
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Component chips with + separator */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-1.5">
                    {components.map((comp, i) => {
                      const key = `${mealKey}:${i}`;
                      const log = eatenComponents.get(key);
                      const isEaten = !!log;
                      const isSubstituted = isEaten && log.description !== comp;

                      // Hide uneaten plan chips when AI has updated this meal
                      if (!isEaten && isAiUpdated) return null;

                      return (
                        <Fragment key={i}>
                          {i > 0 && isEaten && (
                            <span className="text-gray-300 text-xs font-semibold shrink-0 select-none">
                              +
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (isEaten) {
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

                    {/* Extra AI-added chips beyond plan component count */}
                    {extraAiIndices.map((i, arrIdx) => {
                      const key = `${mealKey}:${i}`;
                      const log = eatenComponents.get(key)!;
                      const hasPrevChips = eatenCount - extraAiIndices.length > 0 || arrIdx > 0;
                      return (
                        <Fragment key={i}>
                          {hasPrevChips && <span className="text-gray-300 text-xs font-semibold shrink-0 select-none">+</span>}
                          <button
                            onClick={() => selectComponent(mealKey, i, log.description, 0, 0)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all active:scale-95 max-w-[200px] bg-green-50 border-green-200 text-green-700"
                          >
                            <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                            <span className="leading-snug text-right line-clamp-2">{log.description}</span>
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

        {/* Extra logs from AI / manual food log */}
        {extraLogs.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 mb-3">עדכונים נוספים</h2>
            <div className="flex flex-col gap-2.5">
              {extraLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug truncate">{log.description}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">{log.calories} קק״ל</span>
                      {log.protein > 0 && (
                        <span className="text-[11px] text-blue-500">{log.protein}גר׳ חלבון</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0">
                    {log.meal_type === "custom" ? "ידני" : log.meal_type === "breakfast" ? "בוקר" : log.meal_type === "lunch" ? "צהריים" : log.meal_type === "dinner" ? "ערב" : log.meal_type === "snack1" || log.meal_type === "snack2" ? "ביניים" : log.meal_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* Scan Result Sheet */}
      {scanResult && (
        <ScanResultSheet
          mealLabel={scanResult.mealLabel}
          components={scanResult.components}
          onConfirm={handleScanConfirm}
          onClose={() => setScanResult(null)}
        />
      )}
    </div>
  );
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
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
