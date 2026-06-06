"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
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
  const groupParam = searchParams.get("group");
  const [groups, setGroups] = useState<FoodGroup[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subs")
      .then((r) => r.json())
      .then(({ groups }: { groups: FoodGroup[] }) => {
        setGroups(groups ?? []);
        setActiveKey((prev) => prev ?? groupParam ?? groups?.[0]?.key ?? null);
        setLoading(false);
      });
  }, [groupParam]);

  // עדכון קטגוריה אם הגיע deep-link חדש
  useEffect(() => {
    if (groupParam) setActiveKey(groupParam);
  }, [groupParam]);

  const active = groups.find((g) => g.key === activeKey);

  return (
    <div className="pb-24">
      {/* כותרת */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">חוברת תחליפים</h1>
        <p className="text-sm text-gray-500 mt-0.5">החלף מנה בתחליף שווה ערך מאותה קבוצה</p>
      </div>

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
            {active.items.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-start gap-2.5 px-4 py-3 ${
                  i < active.items.length - 1 ? "border-b border-gray-50" : ""
                } ${item.is_star ? "bg-amber-50" : ""}`}
              >
                <span className={`mt-0.5 shrink-0 ${item.is_star ? "text-amber-500" : "text-green-400"}`}>
                  {item.is_star ? "★" : "•"}
                </span>
                <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
              </div>
            ))}
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
