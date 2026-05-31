"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import mealPlanData from "@/data/mealPlan.json";
import { DayPlan, SubstitutionGroup } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MEAL_ORDER = ["breakfast", "snack1", "lunch", "snack2", "dinner"] as const;

const MEAL_COLORS: Record<string, string> = {
  breakfast: "bg-amber-50 border-amber-200 text-amber-700",
  snack1: "bg-blue-50 border-blue-200 text-blue-700",
  lunch: "bg-green-50 border-green-200 text-green-700",
  snack2: "bg-purple-50 border-purple-200 text-purple-700",
  dinner: "bg-rose-50 border-rose-200 text-rose-700",
};

const SUB_COLORS = [
  "bg-orange-50 border-orange-200",
  "bg-sky-50 border-sky-200",
  "bg-green-50 border-green-200",
  "bg-yellow-50 border-yellow-200",
  "bg-pink-50 border-pink-200",
  "bg-violet-50 border-violet-200",
];

export default function MenuPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"weekly" | "subs">("weekly");
  const [expandedDay, setExpandedDay] = useState<string | null>(
    DAY_NAMES[new Date().getDay()]
  );
  const [expandedSub, setExpandedSub] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/onboarding");
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const weeklyPlan = mealPlanData.weeklyPlan as Record<string, DayPlan>;
  const substitutions = mealPlanData.substitutions as SubstitutionGroup[];
  const todayName = DAY_NAMES[new Date().getDay()];

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">התפריט שלי</h1>
        <p className="text-sm text-gray-500 mt-0.5">תוכנית שר פיטנס</p>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 pt-3 pb-0 border-b border-gray-100 flex gap-1">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
            activeTab === "weekly"
              ? "text-green-700 border-b-2 border-green-600"
              : "text-gray-400"
          }`}
        >
          תפריט שבועי
        </button>
        <button
          onClick={() => setActiveTab("subs")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
            activeTab === "subs"
              ? "text-green-700 border-b-2 border-green-600"
              : "text-gray-400"
          }`}
        >
          תחליפים
        </button>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        {activeTab === "weekly" ? (
          <>
            {DAY_NAMES.map((day) => {
              const plan = weeklyPlan[day] as DayPlan | undefined;
              const isExpanded = expandedDay === day;
              const isToday = day === todayName;
              const totalCal = plan
                ? MEAL_ORDER.reduce((s, k) => s + (plan[k]?.calories ?? 0), 0)
                : 0;

              return (
                <div
                  key={day}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${
                    isToday ? "border-green-300" : "border-gray-100"
                  }`}
                >
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                    className="w-full flex items-center justify-between px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        יום {day}
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          היום
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{totalCal} קק״ל</span>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && plan && (
                    <div className="px-3 pb-3 flex flex-col gap-2 border-t border-gray-50 pt-2">
                      {MEAL_ORDER.map((mealKey) => {
                        const meal = plan[mealKey];
                        if (!meal) return null;
                        const colorClass = MEAL_COLORS[mealKey];
                        return (
                          <div
                            key={mealKey}
                            className={`rounded-xl border px-3 py-2.5 ${colorClass.split(" ").slice(0, 2).join(" ")}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold ${colorClass.split(" ")[2]}`}>
                                {meal.label}
                              </span>
                              <span className="text-xs text-gray-400">{meal.calories} קק״ל</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-snug">
                              {meal.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400 text-center py-1 pb-2">
              החלף מנה בתחליף שווה ערך מאותה קבוצה בלבד
            </p>
            {substitutions.map((group, i) => {
              const isExpanded = expandedSub === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden shadow-sm border ${SUB_COLORS[i % SUB_COLORS.length]}`}
                >
                  <button
                    onClick={() => setExpandedSub(isExpanded ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3.5"
                  >
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{group.group}</p>
                      {group.note && (
                        <p className="text-xs text-gray-400 mt-0.5">{group.note}</p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0 mr-2" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0 mr-2" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-white/50 pt-2 flex flex-col gap-1.5">
                      {group.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 shrink-0">•</span>
                          <p className="text-sm text-gray-700 leading-snug">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
