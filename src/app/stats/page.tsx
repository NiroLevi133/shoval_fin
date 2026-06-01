"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import BottomNav from "@/components/BottomNav";
import { FoodLog } from "@/types";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

type DayStat = {
  date: string;
  calories: number;
  protein: number;
  mealCount: number;
};

const HEBREW_MONTHS = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];
const DAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayColor(cal: number, target: number, hasData: boolean): string {
  if (!hasData) return "bg-gray-100 text-gray-300";
  const ratio = cal / target;
  if (ratio >= 0.9) return "bg-green-500 text-white";
  if (ratio >= 0.6) return "bg-green-300 text-white";
  if (ratio >= 0.3) return "bg-yellow-300 text-gray-700";
  return "bg-gray-200 text-gray-500";
}

export default function StatsPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayStats, setDayStats] = useState<Record<string, DayStat>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayDate = new Date();
  const todayStr = localDateStr(todayDate);
  const targetDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const calorieTarget = user?.calorie_target ?? 1300;
  const proteinTarget = user?.protein_target ?? 110;

  const fetchMonthData = useCallback(async () => {
    if (!user?.phone) return;
    setLoading(true);
    const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

    const res = await fetch(
      `/api/stats?phone=${user.phone}&date_from=${firstDay}&date_to=${lastDayStr}`
    );
    const { data } = await res.json() as { data: { date: string; calories: number; protein: number; meal_count: number }[] };

    if (data) {
      const grouped: Record<string, DayStat> = {};
      data.forEach((row) => {
        grouped[row.date] = {
          date: row.date,
          calories: row.calories,
          protein: row.protein,
          mealCount: row.meal_count,
        };
      });
      setDayStats(grouped);
    }
    setLoading(false);
  }, [user?.phone, year, month]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) fetchMonthData();
  }, [user, isLoading, router, fetchMonthData]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  // Summary stats — only days with actual data
  const activeDays = Object.values(dayStats).filter((d) => d.calories > 0);
  const avgCalories = activeDays.length
    ? Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / activeDays.length)
    : 0;
  const avgProtein = activeDays.length
    ? Math.round(activeDays.reduce((s, d) => s + d.protein, 0) / activeDays.length)
    : 0;
  const daysOnTrack = activeDays.filter((d) => d.calories / calorieTarget >= 0.9).length;
  const totalMeals = activeDays.reduce((s, d) => s + d.mealCount, 0);

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">מעקב חודשי</h1>
        <p className="text-sm text-gray-500 mt-0.5">ביצועי התזונה שלך</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Month navigation */}
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform"
            >
              <ChevronRight size={20} className="text-gray-500" />
            </button>
            <h2 className="text-base font-bold text-gray-800">
              {HEBREW_MONTHS[month]} {year}
            </h2>
            <button
              onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
              disabled={monthOffset === 0}
              className="p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform disabled:opacity-30"
            >
              <ChevronLeft size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const stat = dayStats[dateStr];
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;
                const hasData = !!stat && stat.calories > 0;
                const colorClass = isFuture ? "bg-gray-50 text-gray-300" : getDayColor(stat?.calories ?? 0, calorieTarget, hasData);

                return (
                  <button
                    key={day}
                    onClick={() => !isFuture && setSelectedDate(dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all active:scale-95 ${colorClass} ${
                      isToday ? "ring-2 ring-green-600 ring-offset-1" : ""
                    }`}
                  >
                    <span>{day}</span>
                    {hasData && (
                      <span className="text-[8px] opacity-80 leading-none">{stat.calories}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-3 mt-3 justify-center flex-wrap">
            {[
              { color: "bg-green-500", label: "על המסלול" },
              { color: "bg-green-300", label: "טוב" },
              { color: "bg-yellow-300", label: "חלקי" },
              { color: "bg-gray-200", label: "מעט" },
              { color: "bg-gray-100", label: "ללא נתונים" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={activeDays.length} label="ימים מתועדים" sub={`מתוך ${daysInMonth} ימים`} color="text-green-600" />
          <StatCard value={daysOnTrack} label="ימים על היעד" sub={`≥90% מ-${calorieTarget} קק״ל`} color="text-blue-600" />
          <StatCard value={avgCalories} label="ממוצע קק״ל" sub={`יעד: ${calorieTarget}`} color="text-orange-500" />
          <StatCard value={Math.round(avgProtein)} label="ממוצע חלבון" sub={`יעד: ${proteinTarget}גר׳`} color="text-purple-600" />
        </div>

        {activeDays.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">סיכום חודשי</h3>
            <div className="flex flex-col gap-2">
              <SummaryRow label="סה״כ ארוחות מתועדות" value={`${totalMeals}`} />
              <SummaryRow
                label="אחוז עמידה ביעד"
                value={`${activeDays.length > 0 ? Math.round((daysOnTrack / activeDays.length) * 100) : 0}%`}
              />
              <SummaryRow
                label="יום הטוב ביותר"
                value={activeDays.length > 0
                  ? formatDate(activeDays.reduce((a, b) => a.calories > b.calories ? a : b).date)
                  : "—"}
              />
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      {selectedDate && (
        <DayDetailSheet
          date={selectedDate}
          stat={dayStats[selectedDate]}
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
          phone={user.phone}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

// ─── Day Detail Sheet ───────────────────────────────────────────────
function DayDetailSheet({
  date, stat, calorieTarget, proteinTarget, phone, onClose,
}: {
  date: string;
  stat: DayStat | undefined;
  calorieTarget: number;
  proteinTarget: number;
  phone: string;
  onClose: () => void;
}) {
  const [meals, setMeals] = useState<FoodLog[]>([]);
  const [showMeals, setShowMeals] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleShowMeals = async () => {
    if (showMeals) { setShowMeals(false); return; }
    setLoadingMeals(true);
    const res = await fetch(`/api/logs?phone=${phone}&date=${date}&eaten=true`);
    const { data } = await res.json() as { data: FoodLog[] };
    // filter out marker entries
    setMeals((data ?? []).filter((l) => l.calories > 0 || l.meal_type.includes(":")));
    setShowMeals(true);
    setLoadingMeals(false);
  };

  const calories = stat?.calories ?? 0;
  const protein = stat?.protein ?? 0;
  const calPct = Math.min((calories / calorieTarget) * 100, 100);
  const protPct = Math.min((protein / proteinTarget) * 100, 100);

  const MEAL_LABELS: Record<string, string> = {
    breakfast: "בוקר", snack1: "ביניים 1", lunch: "צהריים",
    snack2: "ביניים 2", dinner: "ערב", custom: "נוסף",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[11px] text-gray-400">סיכום יום</p>
            <p className="text-sm font-bold text-gray-800">{formatDate(date)}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Calories */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">קלוריות</span>
              <span className={`font-semibold ${calories >= calorieTarget * 0.9 ? "text-green-600" : "text-gray-500"}`}>
                {calories} / {calorieTarget} קק״ל
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${calories >= calorieTarget * 0.9 ? "bg-green-500" : calories >= calorieTarget * 0.6 ? "bg-green-300" : "bg-yellow-400"}`}
                style={{ width: `${calPct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{Math.round(calPct)}% מהיעד</p>
          </div>

          {/* Protein */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">חלבון</span>
              <span className={`font-semibold ${protein >= proteinTarget * 0.9 ? "text-blue-600" : "text-gray-500"}`}>
                {Math.round(protein)} / {proteinTarget} גר׳
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${protPct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{Math.round(protPct)}% מהיעד</p>
          </div>

          {/* Show meals button */}
          <button
            onClick={handleShowMeals}
            disabled={loadingMeals}
            className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {loadingMeals
              ? <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              : showMeals ? "הסתר ארוחות ▲" : "מה אכלתי ביום זה ▼"}
          </button>

          {/* Meals list */}
          {showMeals && (
            <div className="flex flex-col gap-2">
              {meals.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-3">אין נתונים לתאריך זה</p>
              ) : (
                meals.map((log, i) => {
                  const mealKey = log.meal_type.includes(":") ? log.meal_type.split(":")[0] : log.meal_type;
                  const label = MEAL_LABELS[mealKey] ?? mealKey;
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-green-600 block">{label}</span>
                        <p className="text-sm text-gray-700 leading-snug">{log.description}</p>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <p className="text-xs text-gray-500">{log.calories} קק״ל</p>
                        {log.protein > 0 && (
                          <p className="text-[10px] text-blue-400">{log.protein}גר׳</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          <div className="h-2 shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────
function StatCard({ value, label, sub, color }: {
  value: number; label: string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}
