"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import BottomNav from "@/components/BottomNav";
import MealCard from "@/components/MealCard";
import { DAY_NAMES, DayName, MealType } from "@/types";

type DayMeal = {
  meal_type: MealType;
  label: string;
  required_text: string;
  example: string;
  calories: number | null;
};

export default function WeekPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const todayName = DAY_NAMES[new Date().getDay()] as DayName;
  const [selectedDay, setSelectedDay] = useState<DayName>(todayName);
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDay = useCallback(async (day: DayName) => {
    setLoading(true);
    const res = await fetch(`/api/menu?day=${encodeURIComponent(day)}`).then((r) => r.json());
    setMeals(res.meals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) loadDay(selectedDay);
  }, [user, isLoading, router, selectedDay, loadDay]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <div className="pb-24">
      {/* כותרת */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">תפריט שבועי</h1>
        <p className="text-sm text-gray-500 mt-0.5">תוכנית שר פיטנס — בחר יום</p>
      </div>

      {/* בורר ימים */}
      <div className="bg-white px-3 py-3 border-b border-gray-100 flex gap-1.5 overflow-x-auto">
        {DAY_NAMES.map((day) => {
          const active = day === selectedDay;
          const isToday = day === todayName;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day as DayName)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                active ? "bg-green-600 text-white" : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              {day}
              {isToday && <span className={`mr-1 text-[10px] ${active ? "text-green-100" : "text-green-500"}`}>•היום</span>}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-gray-500">יום {selectedDay}</h2>
          {totalCal > 0 && <span className="text-xs text-gray-400">סה״כ ~{totalCal} קק״ל</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          meals.map((m) => (
            <MealCard
              key={m.meal_type}
              label={m.label}
              requiredText={m.required_text}
              example={m.example}
              calories={m.calories}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
