"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import BottomNav from "@/components/BottomNav";
import { FoodLog } from "@/types";
import { ChevronRight, ChevronLeft } from "lucide-react";

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

  const todayDate = new Date();
  const today = todayDate; // keep reference for todayStr below
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
      `/api/logs?phone=${user.phone}&date_from=${firstDay}&date_to=${lastDayStr}&eaten=true`
    );
    const { data } = await res.json() as { data: FoodLog[] };

    if (data) {
      const grouped: Record<string, DayStat> = {};
      data.forEach((log) => {
        if (!grouped[log.date]) {
          grouped[log.date] = { date: log.date, calories: 0, protein: 0, mealCount: 0 };
        }
        grouped[log.date].calories += log.calories || 0;
        grouped[log.date].mealCount += 1;
        if (log.protein && log.protein > 0) {
          grouped[log.date].protein += log.protein;
        } else {
          grouped[log.date].protein += Math.round((log.calories || 0) * 0.28 / 4);
        }
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
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  // Summary stats
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
                  <div
                    key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all ${colorClass} ${
                      isToday ? "ring-2 ring-green-600 ring-offset-1" : ""
                    }`}
                  >
                    <span>{day}</span>
                    {hasData && (
                      <span className="text-[8px] opacity-80 leading-none">{stat.calories}</span>
                    )}
                  </div>
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
          <StatCard
            value={activeDays.length}
            label="ימים מתועדים"
            sub={`מתוך ${daysInMonth} ימים`}
            color="text-green-600"
          />
          <StatCard
            value={daysOnTrack}
            label="ימים על היעד"
            sub={`≥90% מ-${calorieTarget} קק״ל`}
            color="text-blue-600"
          />
          <StatCard
            value={avgCalories}
            label="ממוצע קק״ל"
            sub={`יעד: ${calorieTarget}`}
            color="text-orange-500"
          />
          <StatCard
            value={Math.round(avgProtein)}
            label="ממוצע חלבון"
            sub={`יעד: ${proteinTarget}גר׳`}
            color="text-purple-600"
          />
        </div>

        {/* Best/worst days */}
        {activeDays.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">סיכום חודשי</h3>
            <div className="flex flex-col gap-2">
              <SummaryRow
                label="סה״כ ארוחות מתועדות"
                value={`${totalMeals}`}
              />
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
    </div>
  );
}

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
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
}
