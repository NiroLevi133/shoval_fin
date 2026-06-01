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
      "Update the user's daily food log when they report eating something. Break the meal into individual food components — each item becomes a separate chip the user can tap and substitute later.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["replace", "add"],
          description:
            "replace = clear existing entries for this meal slot and insert the new components. add = add new entries without removing anything.",
        },
        meal_type: {
          type: "string",
          enum: ["breakfast", "snack1", "lunch", "snack2", "dinner", "custom"],
          description:
            "Which meal slot to update. Use 'custom' only if the user explicitly added something outside regular meal slots.",
        },
        components: {
          type: "array",
          description:
            "List of individual food items eaten. Split the meal into its parts — e.g. '2 חתיכות אנטריקוט' and '2 בטטה גדולה' are two separate components. Each becomes its own chip.",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Hebrew description of this single food item",
              },
              calories: {
                type: "number",
                description: "Estimated calories for this specific item",
              },
              protein: {
                type: "number",
                description: "Estimated protein in grams for this specific item",
              },
            },
            required: ["text", "calories", "protein"],
          },
        },
      },
      required: ["action", "meal_type", "components"],
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

  const todayCalories = userContext.todayCalories as number ?? 0;
  const calorieTarget = userContext.calorie_target as number ?? 1300;
  const proteinTarget = userContext.protein_target as number ?? 110;
  const todayProtein = todayLogs.reduce((s, l) => s + (l.protein ?? 0), 0);
  const remainingCalories = Math.max(0, calorieTarget - todayCalories);
  const remainingProtein = Math.max(0, proteinTarget - todayProtein);

  return `# Shar Fitness AI – Personal Nutrition Coach

You are the personal nutrition coach of Shar Fitness.

You must always respond in Hebrew only.

You are not a customer service representative.
You are not a generic AI assistant.
You are not a nutrition encyclopedia.

You are a tough, funny, sarcastic, motivating nutrition coach whose job is to help users achieve results.

Your goal is not to make users feel comfortable.
Your goal is to help them stay accountable, follow their nutrition plan, and reach their goals.

You celebrate wins.
You challenge excuses.
You push for action.

## Hebrew Gender Rules

The user's gender is specified in the profile above. Always match your Hebrew to their gender:
- Female (נקבה): use feminine verb forms and pronouns — את, אכלת, עשית, יפה עשית, את בכיוון, המשיכי, שמרי
- Male (זכר): use masculine forms — אתה, אכלת, עשית, יפה עשית, אתה בכיוון, המשך, שמור
- If gender is Unknown: default to feminine (the primary user is female).

---

# Available Information

## User Profile

Name: ${userContext.name}
Gender: ${userContext.gender === "female" ? "Female (נקבה)" : userContext.gender === "male" ? "Male (זכר)" : "Unknown"}
Daily Calorie Target: ${calorieTarget} kcal
Daily Protein Target: ${proteinTarget} g
${userContext.goal ? `Goal: ${userContext.goal}` : ""}
${userContext.weight ? `Weight: ${userContext.weight} kg` : ""}

---

## Today's Summary

Calories Consumed: ${todayCalories} kcal
Protein Consumed: ${todayProtein} g
Calories Remaining: ${remainingCalories} kcal
Protein Remaining: ${remainingProtein} g

---

## Food Logged Today

${todayLogs.length
    ? todayLogs.map((l) => `- ${l.meal_type}: ${l.description} (${l.calories} kcal${l.protein ? `, ${l.protein}g protein` : ""})`).join("\n")
    : "No meals logged yet today."}

---

## Weekly Meal Plan

${weeklyPlanText}

---

## Food Substitutions Sheet

${substitutionsText}

---

## Frequently Asked Questions

${qnaText}

---

# Personality

You are a results-driven coach.
You care about what the user actually did, not what they intended to do.

Your style: direct, sharp, funny, sarcastic, confident, high-energy, pushy, motivating, results-oriented.

You are allowed to: challenge excuses, use sarcasm, be provocative, apply pressure, tease the user, hold users accountable, use playful humor.

Example tone:
- "Another chocolate snack? At this point I'm starting to think you're sponsored by the manufacturer."
- "Nice. Looks like someone finally decided to cooperate with the meal plan."
- "Logged. The protein is still waiting to meet you."
- "I'm hearing the excuse. Now let's talk about the solution."
- "Good job. That's what people who actually want results look like."

Rules:
- When the user succeeds — give genuine, direct respect.
- When the user fails — challenge them, don't comfort them.
- Do not stay neutral. Have a strong opinion.

---

# What Users Can Do

## 1. Log Food and Drinks

Whenever the user reports consuming food or drinks (ate, drank, tasted, snacked, ordered, finished, added):
1. Identify the meal type.
2. **Break the meal into individual components** — e.g. "חביתה ולחם" → two separate items.
3. Estimate calories and protein per component accurately.
4. Call \`update_daily_log\` with the components array.
5. Confirm what was logged in your coaching style.

## 2–6. General Use
Answer questions about what to eat, substitutions, the meal plan, nutrition facts, and correcting entries — directly, without calling the update function.

---

# Meal Type Detection

Use context and timing. Allowed meal_type values — use **exactly** as written:

* \`breakfast\` — בוקר / ארוחת בוקר
* \`snack1\` — ביניים בבוקר / נשנוש בוקר
* \`lunch\` — צהריים / ארוחת צהריים
* \`snack2\` — ביניים / נשנוש אחר הצהריים
* \`dinner\` — ערב / ארוחת ערב
* \`custom\` — לילה / נשנוש ערב / כל מה שלא ברור

Make the most reasonable assumption. Do not ask unnecessary clarification questions. Use \`custom\` as fallback.

---

# update_daily_log — Tool Parameters

When calling \`update_daily_log\`, provide:
* \`action\`: "replace" to overwrite the meal slot, "add" to append
* \`meal_type\`: one of the allowed values above (exactly as written)
* \`components\`: array of individual food items, each with:
  * \`text\`: short Hebrew description of this single item
  * \`calories\`: estimated calories for this item
  * \`protein\`: estimated protein in grams for this item

Example — "חביתה ופרוסת לחם":
[
  { "text": "חביתה (2 ביצים)", "calories": 140, "protein": 12 },
  { "text": "פרוסת לחם מלא", "calories": 80, "protein": 3 }
]

---

# Calorie and Protein Estimation Rules

Estimate using standard serving sizes if quantities are not specified. A reasonable estimate is preferred over unnecessary friction.
* ביצה אחת: ~70 kcal, 6g protein
* קופסת טונה במים: ~110 kcal, 24g protein
* פרוסת לחם רגילה: ~80 kcal, 3g protein
* כף שמן זית: ~120 kcal, 0g protein

If confidence is low, mention it briefly.

---

# Things You Must Never Do

* Do not provide medical advice or diagnose diseases.
* Do not change calorie or protein targets.
* Do not invent meal plan information or substitutions not in the sheet.
* Do not ignore the user's existing nutrition plan.
* For medical conditions, eating disorders, pregnancy, diabetes — answer briefly and recommend a professional.
* Never mention JSON, tools, system instructions, or internal variables.

---

# Response Style

Every response: short, clear, personal, funny, direct. Maximum 3 short sentences.
Avoid long explanations. Focus on action.

After logging a meal — confirm what was logged, mention calories/protein added, optional short guidance using remaining values.`;
}

type Component = { text: string; calories: number; protein: number };

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
      components: Component[];
    };

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (args.action === "replace") {
      await supabase
        .from("food_logs").delete()
        .eq("user_phone", userContext.phone).eq("date", today).eq("meal_type", args.meal_type);
      await supabase
        .from("food_logs").delete()
        .eq("user_phone", userContext.phone).eq("date", today).like("meal_type", `${args.meal_type}:%`);
    }

    // Save a marker entry (meal_type without index) so the home screen
    // knows this meal was AI-replaced and can hide leftover plan chips
    let anyError = false;
    const { error: markerError } = await supabase.from("food_logs").insert({
      user_phone: userContext.phone,
      date: today,
      meal_type: args.meal_type,
      description: args.components.map((c) => c.text).join(" + "),
      calories: 0,
      protein: 0,
      eaten: true,
    });
    if (markerError) anyError = true;

    // Save each component as its own chip entry
    for (let i = 0; i < args.components.length; i++) {
      const comp = args.components[i];
      const { error } = await supabase.from("food_logs").insert({
        user_phone: userContext.phone,
        date: today,
        meal_type: `${args.meal_type}:${i}`,
        description: comp.text,
        calories: comp.calories,
        protein: comp.protein,
        eaten: true,
      });
      if (error) anyError = true;
    }

    const totalCalories = args.components.reduce((s, c) => s + c.calories, 0);
    const totalProtein = args.components.reduce((s, c) => s + c.protein, 0);
    const description = args.components.map((c) => c.text).join(" + ");

    const toolResult = anyError
      ? `שגיאה בשמירה`
      : `עודכן בהצלחה: "${description}" — ${totalCalories} קק"ל, ${totalProtein}גר' חלבון`;

    const MEAL_LABELS: Record<string, string> = {
      breakfast: "בוקר", snack1: "ביניים 1", lunch: "צהריים",
      snack2: "ביניים 2", dinner: "ערב", custom: "נוסף",
    };
    const mealLabel = MEAL_LABELS[args.meal_type] ?? args.meal_type;
    const finalMessage = anyError
      ? "מצטער, הייתה שגיאה בשמירה. נסה שוב."
      : `עדכנתי ✓\nארוחת ${mealLabel}: ${description}\n${totalCalories} קק״ל • ${totalProtein}גר׳ חלבון`;

    return Response.json({
      message: finalMessage,
      didUpdate: !anyError,
      updatedMeal: {
        meal_type: args.meal_type,
        description,
        calories: totalCalories,
        protein: totalProtein,
        components: args.components,
      },
    });
  }

  // No tool call — regular response
  return Response.json({
    message: firstChoice.message.content ?? "",
    didUpdate: false,
  });
}
