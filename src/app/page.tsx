"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useToday } from "@/hooks/useToday";
import BottomNav from "@/components/BottomNav";
import ProgressRing from "@/components/ProgressRing";
import MealCard from "@/components/MealCard";
import ScanResultSheet from "@/components/ScanResultSheet";
import { DAY_NAMES, MealType, MealCompletion } from "@/types";
import { UserCog } from "lucide-react";

type DayMeal = {
  meal_type: MealType;
  label: string;
  required_text: string;
  example: string;
  calories: number | null;
};

const MOTIVATIONAL = [
  "כל ארוחה היא צעד קדימה 💪",
  "את עושה את זה נהדר! 🌟",
  "תזונה טובה = אנרגיה טובה ⚡",
  "יום נוסף, התקדמות נוספת 🎯",
  "הגוף שלך מודה לך על זה 🌱",
];

function getHebrewDate() {
  return new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}

export default function HomePage() {
  const { user, isLoading, version, refresh } = useUser();
  const router = useRouter();
  const today = useToday();
  const todayName = DAY_NAMES[new Date().getDay()];

  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [eaten, setEaten] = useState<Set<MealType>>(new Set());
  const [scanning, setScanning] = useState<MealType | null>(null);
  const [scanResult, setScanResult] = useState<{
    mealType: MealType;
    mealLabel: string;
    components: Array<{ text: string; calories: number; protein: number }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.phone) return;
    const [menuRes, compRes] = await Promise.all([
      fetch(`/api/menu?day=${encodeURIComponent(todayName)}`).then((r) => r.json()),
      fetch(`/api/completions?phone=${encodeURIComponent(user.phone)}&date=${today}`).then((r) => r.json()),
    ]);
    setMeals(menuRes.meals ?? []);
    setEaten(new Set((compRes.data ?? []).map((c: MealCompletion) => c.meal_type)));
  }, [user?.phone, today, todayName]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) loadData();
  }, [user, isLoading, router, loadData, version]);

  const toggleMeal = async (mealType: MealType) => {
    if (!user) return;
    const isEaten = eaten.has(mealType);
    // אופטימי
    setEaten((prev) => {
      const n = new Set(prev);
      if (isEaten) n.delete(mealType); else n.add(mealType);
      return n;
    });
    setError(null);
    try {
      const res = await fetch("/api/completions", {
        method: isEaten ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_phone: user.phone, date: today, meal_type: mealType }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("שגיאה בשמירה — נסה שוב");
      loadData();
    }
  };

  const handleScan = async (mealType: MealType, mealLabel: string, file: File) => {
    setScanning(mealType);
    try {
      const resized = await resizeImage(file, 720);
      const base64 = resized.split(",")[1];
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg", mealLabel }),
      });
      const data = await res.json();
      setScanResult({ mealType, mealLabel, components: data.components ?? [] });
    } catch {
      setError("שגיאה בסריקת התמונה");
    }
    setScanning(null);
  };

  const confirmScan = async (components: Array<{ text: string }>) => {
    if (!scanResult || !user) return;
    const { mealType } = scanResult;
    setScanResult(null);
    setEaten((prev) => new Set(prev).add(mealType));
    await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_phone: user.phone, date: today, meal_type: mealType,
        source: "photo", photo_items: components.map((c) => ({ text: c.text })),
      }),
    });
    refresh();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const doneCount = eaten.size;
  const motivational = MOTIVATIONAL[new Date().getDay() % MOTIVATIONAL.length];

  return (
    <div className="pb-24">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 text-xs">✕</button>
        </div>
      )}

      {/* כותרת */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{getHebrewDate()}</p>
            <h1 className="text-xl font-bold text-gray-900">שלום, {user.name} 👋</h1>
            <p className="text-sm text-green-600 mt-0.5">{motivational}</p>
          </div>
          <Link href="/profile" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 active:scale-95 transition-transform">
            <UserCog size={18} />
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* התקדמות יומית */}
        <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <ProgressRing
            value={doneCount}
            max={5}
            size={96}
            strokeWidth={9}
            color="#16a34a"
            label={`${doneCount}/5`}
            sublabel="ארוחות"
          />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">ההתקדמות שלך היום</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              {doneCount === 5
                ? "כל הכבוד! השלמת את כל הארוחות היום 🎉"
                : doneCount === 0
                ? "סמני ארוחות כשתאכלי אותן כדי לעקוב אחר ההתקדמות"
                : `סימנת ${doneCount} מתוך 5 ארוחות — ממשיכים!`}
            </p>
          </div>
        </div>

        {/* ארוחות היום */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500 px-1">ארוחות היום — {todayName}</h2>
          {meals.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm text-gray-400">טוען תפריט...</p>
            </div>
          ) : (
            meals.map((m) => (
              <MealCard
                key={m.meal_type}
                label={m.label}
                requiredText={m.required_text}
                example={m.example}
                calories={m.calories}
                eaten={eaten.has(m.meal_type)}
                onToggle={() => toggleMeal(m.meal_type)}
                onScan={(file) => handleScan(m.meal_type, m.label, file)}
                scanning={scanning === m.meal_type}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav />

      {scanResult && (
        <ScanResultSheet
          mealLabel={scanResult.mealLabel}
          components={scanResult.components}
          onConfirm={confirmScan}
          onClose={() => setScanResult(null)}
        />
      )}
    </div>
  );
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}
