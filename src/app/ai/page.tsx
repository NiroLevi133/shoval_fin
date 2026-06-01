"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import BottomNav from "@/components/BottomNav";
import { Send, Bot, CheckCircle2 } from "lucide-react";
import { FoodLog } from "@/types";

type Message = {
  role: "user" | "assistant";
  content: string;
  didUpdate?: boolean;
};

const QUICK_QUESTIONS = [
  "מה אכלתי היום?",
  "כמה חלבון נותר לי?",
  "אכלתי משהו אחר — רוצה לעדכן",
  "מה לאכול עכשיו?",
];

export default function AIPage() {
  const { user, isLoading, refreshLogs } = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [todayLog, setTodayLog] = useState<FoodLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];

  const fetchTodayLog = useCallback(async () => {
    if (!user?.phone) return;
    const res = await fetch(`/api/logs?phone=${user.phone}&date=${today}&eaten=true`);
    const { data } = await res.json() as { data: FoodLog[] };
    const localData: FoodLog[] | null = (() => {
      try { return JSON.parse(localStorage.getItem(`fitmeal_logs_${user.phone}_${today}`) ?? "null"); } catch { return null; }
    })();
    const logsData = data && data.length > 0 ? data : localData ?? [];
    setTodayLog(logsData);
  }, [user?.phone, today]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) {
      fetchTodayLog();
      setMessages([{
        role: "assistant",
        content: `שלום ${user.name}! 👋 אני המאמן התזונתי שלך.\n\nאפשר לשאול אותי שאלות על התפריט, ולספר לי מה אכלת — ואני אעדכן את היומן שלך אוטומטית. 🍽️`,
      }]);
    }
  }, [user, isLoading, router, fetchTodayLog]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || sending || !user) return;

    const userMsg: Message = { role: "user", content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      // Refresh today's log before sending to have latest data
      const latestRes = await fetch(`/api/logs?phone=${user.phone}&date=${today}&eaten=true`);
      const { data: latestLog } = await latestRes.json() as { data: FoodLog[] };
      const currentLog = latestLog?.length > 0 ? latestLog : todayLog;
      const todayCalories = currentLog.reduce((s: number, l: FoodLog) => s + (l.calories || 0), 0);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
          userContext: { ...user, todayLog: currentLog, todayCalories },
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json() as {
        message: string;
        didUpdate: boolean;
        updatedMeal?: { meal_type: string; description: string; calories: number; protein: number };
      };

      const assistantMsg: Message = {
        role: "assistant",
        content: data.message,
        didUpdate: data.didUpdate,
      };

      setMessages([...newMessages, assistantMsg]);

      if (data.didUpdate && data.updatedMeal) {
        // Save component entries to localStorage so home page reflects AI updates
        const { meal_type, components } = data.updatedMeal as {
          meal_type: string;
          description: string;
          calories: number;
          protein: number;
          components: Array<{ text: string; calories: number; protein: number }>;
        };
        const key = `fitmeal_logs_${user.phone}_${today}`;
        try {
          const existing: FoodLog[] = JSON.parse(localStorage.getItem(key) ?? "[]");
          const updated: FoodLog[] = [
            ...existing.filter((l) => l.meal_type !== meal_type && !l.meal_type.startsWith(`${meal_type}:`)),
            // marker so home screen knows this meal was AI-replaced
            {
              id: crypto.randomUUID(),
              user_phone: user.phone,
              date: today,
              meal_type: meal_type,
              description: components.map((c: { text: string }) => c.text).join(" + "),
              calories: 0,
              protein: 0,
              eaten: true,
              created_at: new Date().toISOString(),
            },
            ...components.map((comp, i) => ({
              id: crypto.randomUUID(),
              user_phone: user.phone,
              date: today,
              meal_type: `${meal_type}:${i}`,
              description: comp.text,
              calories: comp.calories,
              protein: comp.protein,
              eaten: true,
              created_at: new Date().toISOString(),
            })),
          ];
          localStorage.setItem(key, JSON.stringify(updated));
        } catch {}
        await fetchTodayLog();
        refreshLogs();
      }
    } catch {
      setMessages([...newMessages, {
        role: "assistant",
        content: "מצטער, אירעה שגיאה. נסה שוב.",
      }]);
    }

    setSending(false);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayCalories = todayLog.reduce((s, l) => s + (l.calories || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Bot className="text-green-600" size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">מאמן AI</h1>
              <p className="text-xs text-green-500">מחובר • GPT-4o-mini</p>
            </div>
          </div>
          {todayCalories > 0 && (
            <div className="text-left">
              <p className="text-xs text-gray-400">היום</p>
              <p className="text-sm font-semibold text-green-600">{todayCalories} קק״ל</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center ml-2 shrink-0 mt-1">
                <Bot className="text-green-600" size={14} />
              </div>
            )}
            <div className="max-w-[82%] flex flex-col gap-1">
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-green-600 text-white rounded-tl-sm"
                    : "bg-white text-gray-800 shadow-sm rounded-tr-sm"
                }`}
              >
                {msg.content}
              </div>
              {msg.didUpdate && (
                <div className="flex items-center gap-1.5 px-1">
                  <CheckCircle2 size={13} className="text-green-500" />
                  <span className="text-[11px] text-green-600 font-medium">יומן עודכן ✓</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center ml-2 shrink-0 mt-1">
              <Bot className="text-green-600" size={14} />
            </div>
            <div className="bg-white rounded-2xl rounded-tr-sm shadow-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0 bg-gray-50">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={sending}
              className="shrink-0 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-700 whitespace-nowrap shadow-sm active:scale-95 transition-transform"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="bg-white border-t border-gray-100 px-4 py-3 shrink-0"
        style={{ paddingBottom: "calc(72px + 12px)" }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !sending && sendMessage()}
            placeholder="ספר מה אכלת, או שאל שאלה..."
            disabled={sending}
            className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-100 disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-green-600 rounded-full flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-transform shrink-0"
          >
            <Send size={18} className="rotate-180" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          ספר מה אכלת והAI יעדכן את היומן אוטומטית
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
