"use client";

import { useEffect } from "react";
import { X, CheckCircle2, Camera } from "lucide-react";

type ScanComponent = { text: string; calories: number; protein: number };

type Props = {
  mealLabel: string;
  components: ScanComponent[];
  onConfirm: (components: ScanComponent[]) => void;
  onClose: () => void;
};

export default function ScanResultSheet({ mealLabel, components, onConfirm, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const totalCalories = components.reduce((s, c) => s + c.calories, 0);
  const totalProtein = components.reduce((s, c) => s + c.protein, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Camera size={15} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">סריקת תמונה — {mealLabel}</p>
              <p className="text-sm font-semibold text-gray-800">
                {totalCalories} קק״ל • {totalProtein}גר׳ חלבון
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Components list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
          {components.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">לא זוהו פריטים בתמונה</p>
          ) : (
            components.map((comp, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-purple-400 shrink-0">•</span>
                  <p className="text-sm text-gray-700 leading-snug">{comp.text}</p>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <p className="text-[11px] text-gray-500">{comp.calories} קק״ל</p>
                  {comp.protein > 0 && (
                    <p className="text-[10px] text-blue-400">{comp.protein}גר׳ חלבון</p>
                  )}
                </div>
              </div>
            ))
          )}
          <div className="h-2 shrink-0" />
        </div>

        {/* Actions */}
        <div className="px-4 pb-6 pt-2 flex flex-col gap-2 shrink-0 border-t border-gray-100">
          <button
            onClick={() => onConfirm(components)}
            disabled={components.length === 0}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 text-white rounded-2xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-40"
          >
            <CheckCircle2 size={17} />
            שמור לארוחה
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 text-sm border border-gray-200 rounded-2xl active:scale-95 transition-transform"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
