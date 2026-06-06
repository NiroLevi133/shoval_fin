"use client";

import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Circle } from "lucide-react";
import { detectGroupKey, parseComponents } from "@/lib/groupDetect";

type MealCardProps = {
  label: string;
  requiredText: string;
  example: string;
  calories?: number | null;
  // אינטראקציה (תפריט יומי בלבד)
  mealType?: string;
  swaps?: Record<number, string>; // index -> טקסט תחליף שנבחר
  eaten?: boolean;
  onToggle?: () => void;
  onScan?: (file: File) => void;
  scanning?: boolean;
};

const MEAL_ACCENT: Record<string, string> = {
  "ארוחת בוקר": "border-r-amber-300",
  "ארוחת ביניים": "border-r-blue-300",
  "ארוחת צהריים": "border-r-green-300",
  "ארוחת ערב": "border-r-rose-300",
};

export default function MealCard({
  label,
  requiredText,
  example,
  calories,
  mealType,
  swaps,
  eaten,
  onToggle,
  onScan,
  scanning,
}: MealCardProps) {
  const router = useRouter();
  const components = parseComponents(example);
  const interactive = !!onToggle;
  const accent = MEAL_ACCENT[label] ?? "border-r-gray-200";

  const openSubs = (original: string, idx: number) => {
    const groupKey = detectGroupKey(original);
    const params = new URLSearchParams();
    if (groupKey) params.set("group", groupKey);
    // מצב החלפה — רק בתפריט היומי (כשיש mealType)
    if (mealType) {
      params.set("meal", mealType);
      params.set("idx", String(idx));
      params.set("orig", original);
    }
    router.push(`/subs?${params.toString()}`);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-r-4 ${accent} p-4 shadow-sm transition-all ${
        eaten ? "ring-1 ring-green-200" : ""
      }`}
    >
      {/* כותרת */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${eaten ? "text-green-600" : "text-gray-800"}`}>
            {label}
          </span>
          {eaten && <span className="text-green-500 text-xs">✓ נאכל</span>}
        </div>
        <div className="flex items-center gap-2">
          {calories != null && <span className="text-[11px] text-gray-400">{calories} קק״ל</span>}
          {onScan && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onScan(f);
                  e.target.value = "";
                }}
              />
              {scanning ? (
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-6 h-6 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center active:scale-95 transition-transform">
                  <Camera size={12} className="text-purple-500" />
                </div>
              )}
            </label>
          )}
        </div>
      </div>

      {/* נדרש (מבנה) */}
      <div className="bg-gray-50 rounded-xl px-3 py-2 mb-2.5">
        <p className="text-[10px] text-gray-400 mb-0.5 font-medium">נדרש</p>
        <p className="text-xs text-gray-600 leading-snug">{requiredText}</p>
      </div>

      {/* דוגמה — רכיבים לחיצים */}
      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">
        {mealType ? "מה אכלת? (לחץ רכיב להחלפה)" : "דוגמה (לחץ רכיב להחלפה)"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {components.map((comp, i) => {
          const swapped = swaps?.[i];
          const display = swapped ?? comp;
          return (
            <button
              key={i}
              onClick={() => openSubs(comp, i)}
              className={`px-2.5 py-1.5 rounded-xl text-xs border active:scale-95 transition-all text-right leading-snug max-w-full ${
                swapped
                  ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:border-green-300"
              }`}
            >
              {swapped && <span className="text-blue-400 ml-1">↔</span>}
              {display}
            </button>
          );
        })}
      </div>

      {/* סימון נאכל (תפריט יומי) */}
      {interactive && (
        <button
          onClick={onToggle}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
            eaten
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-green-600 text-white"
          }`}
        >
          {eaten ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {eaten ? "נאכל ✓ (בטל סימון)" : "סמן כנאכל"}
        </button>
      )}
    </div>
  );
}
