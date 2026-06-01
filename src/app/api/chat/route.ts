import { NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import mealPlanData from "@/data/mealPlan.json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UPDATE_DAILY_LOG_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "update_daily_log",
    description:
      "Update the user's daily food log when they report eating something different from the plan, eating extra food, or want to replace a meal. Use this whenever the user describes what they actually ate today.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["replace", "add"],
          description:
            "replace = delete the existing entry for this meal slot and insert the new one. add = add a new entry without removing anything.",
        },
        meal_type: {
          type: "string",
          enum: ["breakfast", "snack1", "lunch", "snack2", "dinner", "custom"],
          description:
            "Which meal slot to update. Use 'custom' only if the user explicitly added something outside the regular meal slots.",
        },
        description: {
          type: "string",
          description: "Exact Hebrew description of what was actually eaten",
        },
        calories: {
          type: "number",
          description:
            "Your best estimate of total calories based on nutrition knowledge. Be accurate.",
        },
        protein: {
          type: "number",
          description:
            "Your best estimate of total protein in grams based on nutrition knowledge.",
        },
      },
      required: ["action", "meal_type", "description", "calories", "protein"],
    },
  },
};

function buildSystemPrompt(userContext: Record<string, unknown>): string {
  const substitutionsText = mealPlanData.substitutions
    .map((g) => `**${g.group}** (${g.note})\n${g.items.join("\n")}`)
    .join("\n\n");

  const qnaText = mealPlanData.qna
    .map((q, i) => `שאלה ${i + 1}: ${q.q}\nתשובה: ${q.a}`)
    .join("\n\n");

  const weeklyPlanText = Object.entries(mealPlanData.weeklyPlan)
    .map(
      ([day, meals]) =>
        `יום ${day}:\n${Object.entries(
          meals as Record<string, { label: string; description: string; calories: number }>
        )
          .map(([, m]) => `  ${m.label}: ${m.description} (${m.calories} קק"ל)`)
          .join("\n")}`
    )
    .join("\n\n");

  const todayLogs = (userContext.todayLog as Array<{ meal_type: string; description: string; calories: number; protein?: number }> | undefined) ?? [];

  return `אתה מאמן תזונה אישי ותומך של שר פיטנס. אתה עונה בעברית בלבד, בצורה חמה, אישית ומקצועית.

**פרטי המשתמש:**
שם: ${userContext.name}
יעד קלורי יומי: ${userContext.calorie_target ?? 1300} קק"ל
יעד חלבון: ${userContext.protein_target ?? 110} גר'
${userContext.goal ? `מטרה: ${userContext.goal}` : ""}
${userContext.weight ? `משקל: ${userContext.weight} ק"ג` : ""}

**מה ${userContext.name} אכל/ה היום (נתונים עדכניים):**
${todayLogs.length
    ? todayLogs.map((l) => `- ${l.meal_type}: ${l.description} (${l.calories} קק"ל${l.protein ? `, ${l.protein}גר' חלבון` : ""})`).join("\n")
    : "עדיין לא תועדו ארוחות היום"}
**סה"כ קלוריות היום: ${userContext.todayCalories ?? 0} קק"ל**

---

**התפריט השבועי:**
${weeklyPlanText}

---

**גיליון תחליפים:**
${substitutionsText}

---

**שאלות ותשובות נפוצות:**
${qnaText}

---

**הנחיות חשובות:**
- כאשר המשתמש אומר לך מה הוא/היא אכל/ה — קרא תמיד ל-update_daily_log
- זהה את סוג הארוחה לפי שעה/הקשר (בוקר=breakfast, צהריים=lunch וכו')
- אמוד קלוריות וחלבון בצורה מדויקת לפי ידע תזונתי
- אחרי עדכון — אשר למשתמש מה עדכנת ועם כמה קלוריות/חלבון
- לשאלות כלליות — ענה ישירות בלי לקרוא לפונקציה
- תשובות קצרות וברורות — עד 3 משפטים`;
}

export async function POST(req: NextRequest) {
  const { messages, userContext } = await req.json();

  const systemPrompt = buildSystemPrompt(userContext);
  const today = new Date().toISOString().split("T")[0];

  // First call — with function calling enabled
  const firstResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    tools: [UPDATE_DAILY_LOG_TOOL],
    tool_choice: "auto",
    max_tokens: 600,
    temperature: 0.7,
  });

  const firstChoice = firstResponse.choices[0];

  // Tool was called — execute it and get final response
  if (
    firstChoice.finish_reason === "tool_calls" &&
    firstChoice.message.tool_calls?.length
  ) {
    const toolCall = firstChoice.message.tool_calls[0] as OpenAI.Chat.ChatCompletionMessageToolCall & { function: { arguments: string } };
    const args = JSON.parse(toolCall.function.arguments) as {
      action: "replace" | "add";
      meal_type: string;
      description: string;
      calories: number;
      protein: number;
    };

    // Update Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (args.action === "replace") {
      await supabase
        .from("food_logs")
        .delete()
        .eq("user_phone", userContext.phone)
        .eq("date", today)
        .eq("meal_type", args.meal_type);
    }

    const { error } = await supabase.from("food_logs").insert({
      user_phone: userContext.phone,
      date: today,
      meal_type: args.meal_type,
      description: args.description,
      calories: args.calories,
      protein: args.protein,
      eaten: true,
    });

    if (error) console.error("Supabase insert error:", error.message);

    // Always report success to the model — DB errors are handled client-side via localStorage
    const toolResult = `עודכן בהצלחה: "${args.description}" — ${args.calories} קק"ל, ${args.protein}גר' חלבון`;

    // Second call — model acknowledges the update
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        firstChoice.message,
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: toolResult,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const finalMessage = secondResponse.choices[0].message.content ?? "";
    return Response.json({ message: finalMessage, didUpdate: true, updatedMeal: args });
  }

  // No tool call — regular response
  return Response.json({
    message: firstChoice.message.content ?? "",
    didUpdate: false,
  });
}
