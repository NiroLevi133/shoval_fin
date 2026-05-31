"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Bot, User, UtensilsCrossed, BarChart2 } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "בית" },
  { href: "/log", icon: BookOpen, label: "יומן" },
  { href: "/menu", icon: UtensilsCrossed, label: "תפריט" },
  { href: "/stats", icon: BarChart2, label: "מעקב" },
  { href: "/ai", icon: Bot, label: "AI" },
  { href: "/profile", icon: User, label: "פרופיל" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 right-0 left-0 z-50 bg-white border-t border-gray-100 safe-area-pb"
      style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${
                active ? "text-green-600" : "text-gray-400"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium">{label}</span>
              {active && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-green-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
