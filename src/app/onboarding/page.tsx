"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Leaf } from "lucide-react";

export default function OnboardingPage() {
  const { setUser } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("נא להכניס שם"); return; }
    if (!form.phone.trim()) { setError("נא להכניס מספר טלפון"); return; }
    setUser({
      name: form.name.trim(),
      phone: form.phone.trim(),
      calorie_target: 1300,
      protein_target: 110,
      carbs_target: 130,
      fat_target: 45,
    });
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-white">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Leaf className="text-green-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FitMeal AI</h1>
        <p className="text-gray-500 text-sm mt-1">תזונה חכמה, אישית, בכל יום</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">שם פרטי</label>
          <input
            type="text"
            placeholder="שובל"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">מספר טלפון</label>
          <input
            type="tel"
            placeholder="050-0000000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-green-600 text-white font-semibold py-4 rounded-2xl text-base mt-2 active:scale-95 transition-transform"
        >
          בואו נתחיל 🚀
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        פרטיך שמורים רק במכשיר שלך
      </p>
    </div>
  );
}
