"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import mealPlanData from "@/data/mealPlan.json";
import { DayPlan, FoodLog } from "@/types";
import { Plus, Trash2 } from "lucide-react";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function LogPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ description: "", calories: "", protein: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const todayName = DAY_NAMES[new Date().getDay()];
  const weeklyPlan = mealPlanData.weeklyPlan as Record<string, DayPlan>;
  const todayPlan = weeklyPlan[todayName] as DayPlan | undefined;

  const fetchLogs = useCallback(async () => {
    if (!user?.phone) return;
    const { data } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_phone", user.phone)
      .eq("date", today)
      .order("created_at", { ascending: true });
    if (data) setLogs(data);
  }, [user?.phone, today]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) fetchLogs();
  }, [user, isLoading, router, fetchLogs]);

  const getMealLabel = (mealType: string) => {
    if (!todayPlan || !(mealType in todayPlan)) return "ארוחה מותאמת";
    return (todayPlan as Record<string, { label: string }>)[mealType]?.label ?? "ארוחה מותאמת";
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  const addCustomEntry = async () => {
    if (!user || !newEntry.description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("food_logs").insert({
      user_phone: user.phone,
      date: today,
      meal_type: "custom",
      description: newEntry.description,
      calories: parseInt(newEntry.calories) || 0,
      protein: parseFloat(newEntry.protein) || 0,
      eaten: true,
    });
    if (!error) {
      setNewEntry({ description: "", calories: "", protein: "" });
      setShowAdd(false);
      await fetchLogs();
    } else {
      console.error("Insert error:", error.message);
    }
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    setDeleting(id);
    await supabase.from("food_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setDeleting(null);
  };

  const eatenLogs = logs.filter((l) => l.eaten);
  const totalCalories = eatenLogs.reduce((s, l) => s + (l.calories || 0), 0);
  const totalProtein = eatenLogs.reduce((s, l) => {
    if (l.protein && l.protein > 0) return s + l.protein;
    return s + Math.round((l.calories || 0) * 0.28 / 4);
  }, 0);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">יומן אכילה</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long" })}
        </p>
        {/* Quick stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs text-gray-600"><span className="font-semibold">{totalCalories}</span> קק״ל</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-xs text-gray-600"><span className="font-semibold">{Math.round(totalProtein)}</span> גר׳ חלבון</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {logs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-gray-500 text-sm">עדיין לא תועדו ארוחות היום</p>
            <p className="text-gray-400 text-xs mt-1">סמן ארוחות מהבית כ"נאכלו" או הוסף כאן</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
            {logs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-start gap-3 px-4 py-3.5 ${i < logs.length - 1 ? "border-b border-gray-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-green-600">{getMealLabel(log.meal_type)}</span>
                    <span className="text-xs text-gray-400">• {formatTime(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">{log.description}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-400">{log.calories} קק״ל</span>
                    {log.protein > 0 && (
                      <span className="text-xs text-blue-500">{log.protein}גר׳ חלבון</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteEntry(log.id)}
                  disabled={deleting === log.id}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors mt-0.5 shrink-0"
                >
                  {deleting === log.id
                    ? <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom entry */}
        {showAdd ? (
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">הוסף ארוחה ידנית</h3>
            <input
              type="text"
              placeholder="מה אכלת?"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="number"
                placeholder="קלוריות"
                value={newEntry.calories}
                onChange={(e) => setNewEntry({ ...newEntry, calories: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="חלבון (גר׳)"
                value={newEntry.protein}
                onChange={(e) => setNewEntry({ ...newEntry, protein: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setNewEntry({ description: "", calories: "", protein: "" }); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500"
              >
                ביטול
              </button>
              <button
                onClick={addCustomEntry}
                disabled={saving || !newEntry.description.trim()}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "שומר..." : "הוסף"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 w-full py-4 bg-white rounded-3xl shadow-sm text-green-600 font-medium text-sm active:scale-95 transition-transform"
          >
            <Plus size={18} />
            הוסף ארוחה ידנית
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
