"use client";

import { useEffect } from "react";
import mealPlanData from "@/data/mealPlan.json";
import { SubstitutionGroup } from "@/types";
import { X, CheckCircle2 } from "lucide-react";

type Props = {
  component: string;
  onSelect: (text: string, calories: number, protein: number) => void;
  onClose: () => void;
};

function detectGroup(text: string): SubstitutionGroup | null {
  const subs = mealPlanData.substitutions as SubstitutionGroup[];
  if (/יוגורט|גבינה|קוטג|ביצ|טונה|סלמון|מלוח|סימפוניה|לבנ|סויה/.test(text))
    return subs.find((g) => g.group === "חלבון חלב ותחליפיו") ?? null;
  if (/עוף|הודו|בשר|דג|קציצ|פרגית|שוקי|טופו/.test(text))
    return subs.find((g) => g.group === "חלבון בשר ותחליפיו") ?? null;
  if (/לחם|אורז|פסטה|קינואה|בורגול|קוסקוס|בטטה|פריכ|קרקר|דגני|פית/.test(text))
    return subs.find((g) => g.group === "קבוצת הפחמימות") ?? null;
  if (/שקד|אגוז|קשיו|זית|שמן|טחינה|חומוס|אבוקד|בוטנ/.test(text))
    return subs.find((g) => g.group === "קבוצת השומנים") ?? null;
  if (/תפוח|אגס|בנ|תפוז|מנגו|מלון|אבטיח|תות|פירות/.test(text))
    return subs.find((g) => g.group.includes("פירות")) ?? null;
  return null;
}

export function estimateMacros(item: string): { calories: number; protein: number } {
  const t = item;
  if (/יוגורט פרו/.test(t)) return { calories: 100, protein: 20 };
  if (/קוטג|לבנה/.test(t)) return { calories: 80, protein: 10 };
  if (/גבינה מלוח|בולגרית|צפתית|חמד/.test(t)) return { calories: 70, protein: 8 };
  if (/גבינה צהוב/.test(t)) return { calories: 90, protein: 8 };
  if (/סימפוניה/.test(t)) return { calories: 75, protein: 9 };
  if (/ביצ/.test(t)) return { calories: 70, protein: 6 };
  if (/טונה/.test(t)) return { calories: 80, protein: 18 };
  if (/סלמון מעושן/.test(t)) return { calories: 90, protein: 14 };
  if (/חזה עוף|הודו|פרגית|קציצ|שוקי/.test(t)) return { calories: 165, protein: 31 };
  if (/בקר|סינטה|אווזית|כתף|פילה/.test(t)) return { calories: 200, protein: 26 };
  if (/דג|אמנון|לברק|פורל|סלמון|בקלה|סול/.test(t)) return { calories: 150, protein: 28 };
  if (/טופו/.test(t)) return { calories: 120, protein: 14 };
  if (/לחם קל/.test(t)) return { calories: 50, protein: 2 };
  if (/לחם|פית/.test(t)) return { calories: 80, protein: 3 };
  if (/אורז|פסטה|קינואה|בורגול|קוסקוס|פתיתים/.test(t)) return { calories: 110, protein: 3 };
  if (/בטטה|תפוח אד/.test(t)) return { calories: 130, protein: 2 };
  if (/פריכ|קרקר/.test(t)) return { calories: 70, protein: 2 };
  if (/דגני בוקר/.test(t)) return { calories: 120, protein: 3 };
  if (/אבוקד/.test(t)) return { calories: 50, protein: 1 };
  if (/שקד|אגוז|קשיו|בוטנ/.test(t)) return { calories: 80, protein: 3 };
  if (/זית/.test(t)) return { calories: 40, protein: 0 };
  if (/שמן/.test(t)) return { calories: 60, protein: 0 };
  if (/טחינה/.test(t)) return { calories: 55, protein: 2 };
  if (/חומוס/.test(t)) return { calories: 45, protein: 2 };
  if (/בנ/.test(t)) return { calories: 100, protein: 1 };
  if (/תפוח|אגס|תפוז/.test(t)) return { calories: 80, protein: 0 };
  if (/תות|פירות יער/.test(t)) return { calories: 50, protein: 1 };
  if (/מנגו|מלון|אבטיח/.test(t)) return { calories: 70, protein: 1 };
  if (/ירק/.test(t)) return { calories: 30, protein: 1 };
  return { calories: 100, protein: 3 };
}

export default function SubstitutionSheet({ component, onSelect, onClose }: Props) {
  const group = detectGroup(component);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSelect = (raw: string) => {
    const clean = raw.replace(/^[•★]\s*/, "").trim();
    const macros = estimateMacros(clean);
    onSelect(clean, macros.calories, macros.protein);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl max-h-[78vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-[11px] text-gray-400 mb-0.5">מה אכלת במקום?</p>
            <p className="text-sm font-semibold text-gray-800 leading-snug">{component}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2.5">
          {/* Eat original */}
          <button
            onClick={() => handleSelect(component)}
            className="flex items-center gap-3 w-full p-3.5 bg-green-50 border border-green-200 rounded-2xl active:scale-[0.98] transition-transform"
          >
            <CheckCircle2 className="text-green-600 shrink-0" size={20} />
            <div className="text-right flex-1">
              <p className="text-xs font-semibold text-green-700 mb-0.5">אכלתי בדיוק את זה ✓</p>
              <p className="text-sm text-gray-700 leading-snug">{component}</p>
            </div>
          </button>

          {group ? (
            <>
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 shrink-0 px-1">
                  תחליפים • {group.group}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {group.note && (
                <p className="text-[11px] text-gray-400 text-center -mt-1 mb-1">{group.note}</p>
              )}
              <div className="flex flex-col gap-1.5">
                {group.items.map((item, i) => {
                  const clean = item.replace(/^[•★]\s*/, "").trim();
                  const macros = estimateMacros(clean);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(item)}
                      className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-right active:bg-gray-100 active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-green-400 shrink-0">•</span>
                        <p className="text-sm text-gray-700 leading-snug">{clean}</p>
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0 mr-2">
                        ~{macros.calories} קק״ל
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">לא נמצאה קבוצת תחליפים</p>
              <p className="text-xs text-gray-300 mt-1">
                {component.includes("ירק") ? "ירקות — אין הגבלה!" : "נסה לעדכן דרך מאמן AI"}
              </p>
            </div>
          )}

          {/* Bottom padding for safe area */}
          <div className="h-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}
