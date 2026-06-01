"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import BottomNav from "@/components/BottomNav";
import { User } from "@/types";
import { LogOut, Save } from "lucide-react";

const GOAL_OPTIONS = [
  { value: "ירידה במשקל", label: "ירידה במשקל", emoji: "⬇️" },
  { value: "שמירה על משקל", label: "שמירה על משקל", emoji: "⚖️" },
  { value: "עלייה בשרירים", label: "עלייה בשרירים", emoji: "💪" },
];

export default function ProfilePage() {
  const { user, setUser, logout, isLoading } = useUser();
  const router = useRouter();
  const [form, setForm] = useState<Partial<User>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) setForm(user);
  }, [user, isLoading, router]);

  const handleSave = () => {
    if (!user) return;
    setUser({ ...user, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push("/onboarding");
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">פרופיל</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user.name}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xl">{user.name[0]?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Personal info */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">פרטים אישיים</h2>
          <div className="flex flex-col gap-3">
            <Field label="שם" value={form.name ?? ""} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="טלפון" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">מגדר</label>
              <div className="grid grid-cols-2 gap-2">
                {([["female", "👩 נקבה"], ["male", "👨 זכר"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, gender: val })}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.gender === val
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="גיל" value={form.age?.toString() ?? ""} onChange={(v) => setForm({ ...form, age: parseInt(v) || undefined })} type="number" />
              <Field label="משקל (ק״ג)" value={form.weight?.toString() ?? ""} onChange={(v) => setForm({ ...form, weight: parseFloat(v) || undefined })} type="number" />
              <Field label="גובה (ס״מ)" value={form.height?.toString() ?? ""} onChange={(v) => setForm({ ...form, height: parseFloat(v) || undefined })} type="number" />
            </div>
          </div>
        </div>

        {/* Goal */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">מטרה</h2>
          <div className="flex flex-col gap-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.value}
                onClick={() => setForm({ ...form, goal: g.value })}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  form.goal === g.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <span>{g.emoji}</span>
                <span className={`text-sm font-medium ${form.goal === g.value ? "text-green-700" : "text-gray-700"}`}>{g.label}</span>
                {form.goal === g.value && <span className="mr-auto text-green-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Targets */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">יעדים תזונתיים</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="קלוריות יומיות" value={form.calorie_target?.toString() ?? "1300"} onChange={(v) => setForm({ ...form, calorie_target: parseInt(v) || 1300 })} type="number" />
            <Field label="חלבון (גר')" value={form.protein_target?.toString() ?? "110"} onChange={(v) => setForm({ ...form, protein_target: parseInt(v) || 110 })} type="number" />
            <Field label="פחמימות (גר')" value={form.carbs_target?.toString() ?? "130"} onChange={(v) => setForm({ ...form, carbs_target: parseInt(v) || 130 })} type="number" />
            <Field label="שומן (גר')" value={form.fat_target?.toString() ?? "45"} onChange={(v) => setForm({ ...form, fat_target: parseInt(v) || 45 })} type="number" />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-3xl font-semibold text-sm transition-all active:scale-95 ${
            saved ? "bg-green-100 text-green-700" : "bg-green-600 text-white shadow-sm"
          }`}
        >
          <Save size={18} />
          {saved ? "נשמר! ✓" : "שמור שינויים"}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-3xl border border-gray-200 text-gray-500 text-sm active:scale-95 transition-transform"
        >
          <LogOut size={16} />
          התנתק
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
      />
    </div>
  );
}
