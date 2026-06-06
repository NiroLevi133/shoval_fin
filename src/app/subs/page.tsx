"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToday } from "@/hooks/useToday";
import BottomNav from "@/components/BottomNav";
import { ArrowRight, RotateCcw } from "lucide-react";
import { FoodGroup } from "@/types";

const GROUP_COLORS: Record<string, string> = {
  carbs: "bg-amber-50 border-amber-200 text-amber-700",
  fruits: "bg-pink-50 border-pink-200 text-pink-700",
  vegetables: "bg-green-50 border-green-200 text-green-700",
  dairy_protein: "bg-blue-50 border-blue-200 text-blue-700",
  meat_protein: "bg-rose-50 border-rose-200 text-rose-700",
  fats: "bg-yellow-50 border-yellow-200 text-yellow-700",
  off_routine: "bg-violet-50 border-violet-200 text-violet-700",
};

function SubsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const today = useToday();

  const groupParam = searchParams.get("group");
  const mealParam = searchParams.get("meal");
  const idxParam = searchParams.get("idx");
  const origParam = searchParams.get("orig");
  const swapMode = mealParam != null && idxParam != null;

  const [groups, setGroups] = useState<FoodGroup[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subs")
      .then((r) => r.json())
      .then(({ groups }: { groups: FoodGroup[] }) => {
        setGroups(groups ?? []);
        setActiveKey((prev) => prev ?? groupParam ?? groups?.[0]?.key ?? null);
        setLoading(false);
      });
  }, [groupParam]);

  useEffect(() => {
    if (groupParam) setActiveKey(groupParam);
  }, [groupParam]);

  const active = groups.find((g) => g.key === activeKey);

  // בחירת תחליף במצב החלפה
  const pickSwap = async (replacement: string) => {
    if (!swapMode || !user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_phone: user.phone,
          date: today,
          meal_type: mealParam,
          item_index: Number(idxParam),
          replacement,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        setError(error?.includes("meal_item_swaps") ? "הטבלה meal_item_swaps לא קיימת — הרץ את המיגרציה ב-Supabase" : (error ?? "שגיאה בשמירה"));
        setSaving(false);
        return;
      }
      router.push("/");
    } catch {
      setError("שגיאת רשת — לא נשמר");
      setSaving(false);
    }
  };

  // חזרה למקור (ביטול החלפה)
  const revertSwap = async () => {
    if (!swapMode || !user || saving) return;
    setSaving(true);
    await fetch("/api/swaps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_phone: user.phone, date: today,
        meal_type: mealParam, item_index: Number(idxParam),
      }),
    });
    router.push("/");
  };

  return (
    <div className="pb-24">
      {/* כותרת */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100">
        {swapMode ? (
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="p-1.5 -mr-1.5 text-gray-400 active:scale-95">
              <ArrowRight size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400">במה להחליף?</p>
              <h1 className="text-base font-bold text-gray-900 truncate">{origParam ?? "בחר תחליף"}</h1>
            </div>
            {origParam && (
              <button
                onClick={revertSwap}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1.5 active:scale-95"
              >
                <RotateCcw size={12} /> מקור
              </button>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">חוברת תחליפים</h1>
            <p className="text-sm text-gray-500 mt-0.5">החלף מנה בתחליף שווה ערך מאותה קבוצה</p>
          </>
        )}
      </div>

      {/* באנר מצב החלפה */}
      {swapMode && !error && (
        <div className="bg-blue-50 border-b border-blue-100 px-5 py-2">
          <p className="text-xs text-blue-700">בחר פריט מהרשימה — הוא יחליף את המנה בתפריט שלך 👇</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 flex items-center justify-between">
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 text-xs">✕</button>
        </div>
      )}

      {/* סינון קטגוריות */}
      <div className="bg-white px-3 py-3 border-b border-gray-100 flex gap-1.5 overflow-x-auto">
        {groups.map((g) => {
          const isActive = g.key === activeKey;
          return (
            <button
              key={g.key}
              onClick={() => setActiveKey(g.key)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                isActive ? "bg-green-600 text-white" : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : active ? (
        <div className="px-4 py-4">
          <div className={`rounded-2xl border p-4 ${GROUP_COLORS[active.key] ?? "bg-gray-50 border-gray-200"}`}>
            <h2 className="text-base font-bold text-gray-800">{active.name}</h2>
            {active.note && <p className="text-xs text-gray-500 mt-0.5">{active.note}</p>}
          </div>

          <div className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
            {active.items.map((item) => {
              const clean = item.text.replace(/^★\s*/, "");
              return (
                <button
                  key={item.id}
                  onClick={() => swapMode && pickSwap(clean)}
                  disabled={!swapMode || saving}
                  className={`w-full flex items-start gap-2.5 px-4 py-3 border-b border-gray-50 last:border-0 text-right ${
                    item.is_star ? "bg-amber-50" : ""
                  } ${swapMode ? "active:bg-green-50 active:scale-[0.99] transition-all" : "cursor-default"}`}
                >
                  <span className={`mt-0.5 shrink-0 ${item.is_star ? "text-amber-500" : "text-green-400"}`}>
                    {item.is_star ? "★" : "•"}
                  </span>
                  <span className="text-sm text-gray-700 leading-snug flex-1">{item.text}</span>
                  {swapMode && <span className="text-[11px] text-green-600 shrink-0 mt-0.5">בחר ←</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-400 text-sm py-12">לא נמצאו תחליפים</p>
      )}

      <BottomNav />
    </div>
  );
}

export default function SubsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SubsContent />
    </Suspense>
  );
}
