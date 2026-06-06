"use client";

import { Fragment, ReactNode } from "react";

// רינדור inline: **מודגש** → <strong>, שאר הטקסט כרגיל.
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i} className="font-bold">{m[1]}</strong>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// מרנדר טקסט Markdown קל מה-AI: כותרות, תבליטים, והדגשות.
export default function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <p key={i} className="font-bold text-gray-900 mt-1">
              {renderInline(heading[1])}
            </p>
          );
        }

        const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-green-500 shrink-0 leading-relaxed">•</span>
              <span className="flex-1">{renderInline(bullet[1])}</span>
            </div>
          );
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
