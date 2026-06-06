"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToday } from "@/hooks/useToday";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, ChevronLeft, Plus, Flame, CheckCircle2 } from "lucide-react";
import { MEAL_ORDER, MealType, ProgressStats, Measurement } from "@/types";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "בוקר", snack1: "ביניים בוקר", lunch: "צהריים", snack2: "ביניים אחה״צ", dinner: "ערב",
};
const HEBREW_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAY_LABELS = ["א","ב","ג","ד","ה","ו","ש"];

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayColor(count: number): string {
  if (count >= 5) return "bg-green-500 text-white";
  if (count >= 3) return "bg-green-300 text-white";
  if (count >= 1) return "bg-yellow-300 text-gray-700";
  return "bg-gray-100 text-gray-300";
}

export default function ProgressPage() {
  const { user, isLoading, version, refresh } = useUser();
  const router = useRouter();
  const today = useToday();

  const [eaten, setEaten] = useState<Set<MealType>>(new Set());
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showAddMeasure, setShowAddMeasure] = useState(false);
  const [newMeasure, setNewMeasure] = useState({ weight: "", waist: "", hips: "", note: "" });

  const todayDate = new Date();
  const target = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month + 1, 0);
  const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;

  const loadAll = useCallback(async () => {
    if (!user?.phone) return;
    const ph = encodeURIComponent(user.phone);
    const [compRes, statsRes, measRes] = await Promise.all([
      fetch(`/api/completions?phone=${ph}&date=${today}`).then((r) => r.json()),
      fetch(`/api/progress?phone=${ph}&from=${firstDay}&to=${lastDay}&today=${today}`).then((r) => r.json()),
      fetch(`/api/measurements?phone=${ph}`).then((r) => r.json()),
    ]);
    setEaten(new Set((compRes.data ?? []).map((c: { meal_type: MealType }) => c.meal_type)));
    setStats(statsRes);
    setMeasurements(measRes.data ?? []);
  }, [user?.phone, today, firstDay, lastDay]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) loadAll();
  }, [user, isLoading, router, loadAll, version]);

  const toggleMeal = async (mt: MealType) => {
    if (!user) return;
    const isEaten = eaten.has(mt);
    setEaten((prev) => { const n = new Set(prev); if (isEaten) n.delete(mt); else n.add(mt); return n; });
    await fetch("/api/completions", {
      method: isEaten ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_phone: user.phone, date: today, meal_type: mt }),
    });
    refresh();
  };

  const addMeasurement = async () => {
    if (!user) return;
    const circ: Record<string, number> = {};
    if (newMeasure.waist) circ.waist = parseFloat(newMeasure.waist);
    if (newMeasure.hips) circ.hips = parseFloat(newMeasure.hips);
    await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_phone: user.phone, date: today,
        weight: newMeasure.weight ? parseFloat(newMeasure.weight) : null,
        circumferences: Object.keys(circ).length ? circ : null,
        note: newMeasure.note || null,
      }),
    });
    setNewMeasure({ weight: "", waist: "", hips: "", note: "" });
    setShowAddMeasure(false);
    loadAll();
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  // לוח שנה
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = lastDate.getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const todayStr = localDateStr(todayDate);

  return (
    <div className="pb-24">
      {/* כותרת */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">מעקב והתקדמות</h1>
        <p className="text-sm text-gray-500 mt-0.5">סמן ארוחות ועקוב אחר הביצועים</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* סימון ארוחות היום */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">ארוחות היום</h2>
          <div className="flex flex-col gap-2">
            {MEAL_ORDER.map((mt) => {
              const isEaten = eaten.has(mt);
              return (
                <button
                  key={mt}
                  onClick={() => toggleMeal(mt)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
                    isEaten ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <CheckCircle2 size={20} className={isEaten ? "text-green-500" : "text-gray-300"} />
                  <span className={`text-sm font-medium ${isEaten ? "text-green-700" : "text-gray-600"}`}>
                    {MEAL_LABELS[mt]}
                  </span>
                  {isEaten && <span className="mr-auto text-green-500 text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* כרטיסי סטטיסטיקה */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={`${stats?.dailyPct ?? 0}%`} label="עמידה יומית" color="text-green-600" />
          <StatCard value={`${stats?.weeklyPct ?? 0}%`} label="עמידה שבועית" color="text-blue-600" />
          <StatCard value={`${stats?.streak ?? 0}`} label="רצף ימים 🔥" color="text-orange-500" icon={<Flame size={14} className="text-orange-400" />} />
          <StatCard value={`${stats?.mealsDone ?? 0}`} label="ארוחות בוצעו (חודש)" color="text-purple-600" />
        </div>

        {/* לוח שנה */}
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMonthOffset((o) => o - 1)} className="p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform">
              <ChevronRight size={20} className="text-gray-500" />
            </button>
            <h2 className="text-base font-bold text-gray-800">{HEBREW_MONTHS[month]} {year}</h2>
            <button onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))} disabled={monthOffset === 0} className="p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform disabled:opacity-30">
              <ChevronLeft size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const count = stats?.byDate[dateStr] ?? 0;
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              return (
                <div
                  key={day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium ${
                    isFuture ? "bg-gray-50 text-gray-300" : dayColor(count)
                  } ${isToday ? "ring-2 ring-green-600 ring-offset-1" : ""}`}
                >
                  <span>{day}</span>
                  {count > 0 && <span className="text-[8px] opacity-80 leading-none">{count}/5</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 justify-center flex-wrap">
            {[{ c: "bg-green-500", l: "5/5" }, { c: "bg-green-300", l: "3-4" }, { c: "bg-yellow-300", l: "1-2" }, { c: "bg-gray-100", l: "ללא" }].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-1"><div className={`w-3 h-3 rounded-sm ${c}`} /><span className="text-[10px] text-gray-500">{l}</span></div>
            ))}
          </div>
        </div>

        {/* מדידות */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500">מדידות</h2>
            <button onClick={() => setShowAddMeasure((s) => !s)} className="text-green-600 text-xs font-medium flex items-center gap-1 active:scale-95 transition-transform">
              <Plus size={14} /> הוסף
            </button>
          </div>

          {showAddMeasure && (
            <div className="bg-gray-50 rounded-2xl p-3 mb-3 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="משקל ק״ג" value={newMeasure.weight} onChange={(e) => setNewMeasure({ ...newMeasure, weight: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <input type="number" placeholder="מותן ס״מ" value={newMeasure.waist} onChange={(e) => setNewMeasure({ ...newMeasure, waist: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <input type="number" placeholder="ירכיים ס״מ" value={newMeasure.hips} onChange={(e) => setNewMeasure({ ...newMeasure, hips: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <button onClick={addMeasurement} className="py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:scale-95 transition-transform">שמור מדידה</button>
            </div>
          )}

          {measurements.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-3">עדיין לא נרשמו מדידות</p>
          ) : (
            <div className="flex flex-col gap-2">
              {measurements.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-400">{new Date(m.date + "T12:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
                  <div className="flex gap-3 text-sm text-gray-700">
                    {m.weight != null && <span>{m.weight} ק״ג</span>}
                    {m.circumferences?.waist != null && <span className="text-gray-500">מותן {m.circumferences.waist}</span>}
                    {m.circumferences?.hips != null && <span className="text-gray-500">ירך {m.circumferences.hips}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({ value, label, color, icon }: { value: string; label: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
    </div>
  );
}
