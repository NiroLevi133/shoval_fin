"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToday } from "@/hooks/useToday";
import BottomNav from "@/components/BottomNav";
import FormattedMessage from "@/components/FormattedMessage";
import { Send, Bot } from "lucide-react";
import { DAY_NAMES } from "@/types";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_QUESTIONS = [
  "מה אפשר לאכול עכשיו?",
  "במה אפשר להחליף קוטג'?",
  "מה כדאי לאכול אחרי אימון?",
  "איזה פרי מתאים במקום תפוח?",
];

function chatKey(phone: string) {
  return `fitmeal_chat_${phone}`;
}

export default function AIPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const today = useToday();
  const dayName = DAY_NAMES[new Date().getDay()];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/onboarding"); return; }
    if (user) {
      const saved = (() => {
        try { return JSON.parse(localStorage.getItem(chatKey(user.phone)) ?? "null") as Message[] | null; }
        catch { return null; }
      })();
      setMessages(saved?.length ? saved : [{
        role: "assistant",
        content: `שלום ${user.name}! 👋 אני התזונאי האישי שלך. אפשר לשאול אותי על התפריט, תחליפים, מה לאכול עכשיו, ועוד — אני עונה על בסיס תוכנית שר פיטנס. 🥗`,
      }]);
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending || !user) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    localStorage.setItem(chatKey(user.phone), JSON.stringify(next));
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          phone: user.phone,
          name: user.name,
          gender: user.gender,
          goal: user.goal,
          weight: user.weight,
          height: user.height,
          age: user.age,
          date: today,
          dayName,
        }),
      });
      const data = await res.json();
      const final = [...next, { role: "assistant" as const, content: data.message || "מצטער, לא הצלחתי לענות." }];
      setMessages(final);
      localStorage.setItem(chatKey(user.phone), JSON.stringify(final));
    } catch {
      const final = [...next, { role: "assistant" as const, content: "מצטער, אירעה שגיאה. נסה שוב." }];
      setMessages(final);
    }
    setSending(false);
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-green-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* כותרת */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100 shrink-0 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Bot className="text-green-600" size={20} />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">תזונאי AI</h1>
          <p className="text-xs text-green-500">מבוסס תוכנית שר פיטנס</p>
        </div>
      </div>

      {/* הודעות */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center ml-2 shrink-0 mt-1">
                <Bot className="text-green-600" size={14} />
              </div>
            )}
            <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-green-600 text-white rounded-tl-sm whitespace-pre-wrap"
                : "bg-white text-gray-800 shadow-sm rounded-tr-sm"
            }`}>
              {msg.role === "assistant" ? <FormattedMessage content={msg.content} /> : msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center ml-2 shrink-0 mt-1">
              <Bot className="text-green-600" size={14} />
            </div>
            <div className="bg-white rounded-2xl rounded-tr-sm shadow-sm px-4 py-3 flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* שאלות מהירות */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0 bg-gray-50">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={sending} className="shrink-0 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-700 whitespace-nowrap shadow-sm active:scale-95 transition-transform">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* קלט */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0" style={{ paddingBottom: "calc(72px + 12px)" }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !sending && send()}
            placeholder="שאל אותי כל דבר על התזונה שלך..."
            disabled={sending}
            className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-100 disabled:opacity-60"
          />
          <button onClick={() => send()} disabled={!input.trim() || sending} className="w-11 h-11 bg-green-600 rounded-full flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-transform shrink-0">
            <Send size={18} className="rotate-180" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
