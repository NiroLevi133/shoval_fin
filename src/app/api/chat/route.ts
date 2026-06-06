import { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildKnowledgeBase } from "@/lib/knowledge";
import { MealType } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHAT_MODEL = "gpt-4o-mini";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "בוקר", snack1: "ביניים בוקר", lunch: "צהריים", snack2: "ביניים אחה״צ", dinner: "ערב",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    messages = [],
    phone,
    name,
    gender,
    goal,
    weight,
    height,
    age,
    date,
  }: {
    messages: ChatMessage[];
    phone?: string;
    name?: string;
    gender?: string;
    goal?: string;
    weight?: number;
    height?: number;
    age?: number;
    date?: string;
    dayName?: string;
  } = body;

  // ── כל ספר הידע (תפריט + תחליפים + מבנה + שו"ת) מוזרק במלואו ──
  const knowledge = buildKnowledgeBase();

  // ── מצב המעקב של היום (דינמי) ──
  let todaySummary = "אין נתוני מעקב.";
  if (phone && date) {
    const { data: comps } = await supabaseAdmin()
      .from("meal_completions")
      .select("meal_type")
      .eq("user_phone", phone)
      .eq("date", date)
      .eq("eaten", true);
    const done = (comps ?? []).map((c) => MEAL_LABELS[c.meal_type as MealType] ?? c.meal_type);
    todaySummary = done.length
      ? `סומנו היום ${done.length}/5 ארוחות: ${done.join(", ")}.`
      : "לא סומנו ארוחות היום עדיין.";
  }

  const genderHe = gender === "female" ? "נקבה" : gender === "male" ? "זכר" : "לא ידוע";

  const systemPrompt = `אתה התזונאי האישי של "שר פיטנס" — חם, מקצועי, תומך ומדויק.

# כללי יסוד
- ענה בעברית בלבד, בקצרה וברורה. כשמבקשים רשימה (למשל "כל התחליפים בקטגוריה") — תן את **הרשימה המלאה** מספר הידע, בלי לקצר ובלי לדלג.
- שמור על עיצוב נקי: לרשימות השתמש בתבליטים (- ), ולהדגשת שם ארוחה/קבוצה ב-**מודגש**. אל תגזים בעיצוב.
- התאם את הלשון למגדר המשתמש (${genderHe}): נקבה = את/אכלת/שמרי; זכר = אתה/אכלת/שמור. אם לא ידוע — פנה בנקבה.
- ענה **אך ורק** על בסיס ספר הידע למטה (תפריט, חוברת תחליפים, מבנה הארוחות, שו"ת) ונתוני המשתמש.
- ❌ אל תמציא מידע, תחליפים, פריטים או נתונים שאינם בספר הידע. אם המידע חסר — אמור זאת בכנות והפנה לתזונאית.
- ❌ אל תיתן ייעוץ רפואי או אבחנה. למצבים רפואיים/הריון/הפרעות אכילה — המלץ על איש מקצוע.
- ✅ הצע תחליפים מתאימים מאותה קבוצה, והסבר בקצרה את הבחירה התזונתית.
- שים לב: יש **שתי** קטגוריות חלבון — "חלבון חלב ותחליפיו" ו-"חלבון בשר ותחליפיו". אם שואלים על "חלבונים" כללי — התייחס לשתיהן.

# איך לבנות הצעת ארוחה (חובה לעקוב אחר הסדר הזה)
כשמבקשים ממך להציע ארוחה / "מה לאכול ל..." / לבנות תפריט — פעל כך, תמיד:
1. **זהה את הארוחה** ומצא ב"מבנה הארוחות" את ה**נדרש** שלה — כמה מנות מכל קבוצה (פחמימה / חלבון חלב / חלבון בשר / שומן / ירקות).
2. **פתח את התשובה בשורת המבנה הנדרש** — בדיוק מה צריך לאכול. לדוגמה:
   "ארוחת ערב צריכה: **מנת פחמימה אחת + 2 מנות חלבון חלב + מנת שומן + 2-3 מנות ירק**."
3. **בחר פריטים אמיתיים מחוברת התחליפים** — לכל קבוצה בחר את מספר המנות הנדרש (לא יותר, לא פחות), ובנה ארוחה הגיונית וטעימה.
4. **הצג את הארוחה כרשימה**, וציין ליד כל פריט לאיזו מנה/קבוצה הוא שייך. לדוגמה:
   "- פרוסת לחם מלא *(מנת פחמימה)*  - ביצה + 50 גר' גבינה בולגרית *(2 מנות חלבון חלב)* ..."
5. ודא שמספר המנות בכל קבוצה **תואם בדיוק** את ה"נדרש". אל תוסיף קבוצה שלא נדרשת ואל תשמיט קבוצה שנדרשת.

# אופי הארוחה (חשוב מאוד — ארוחה אמיתית, לא רשימה אקראית)
- **רכיב מרכזי:** בחר רכיב אחד מוביל (בד"כ החלבון העיקרי או המנה החמה) ובנה את שאר הארוחה סביבו כך שהכול משתלב.
- **קשר והיגיון קולינרי:** המצרכים צריכים "לדבר" אחד עם השני ולהתאים לארוחה אחת אמיתית שמתחשק לאכול — לא צירוף מקרי. למשל: דג אפוי + אורז + ירקות מוקפצים + שמן זית (משתלבים), ולא טונה + יוגורט + אגוזים (לא הגיוני).
- **כשרות — חוק ברזל:** לעולם אל תשלב **בשר / עוף עם מוצרי חלב** באותה ארוחה. אם בחרת חלבון בשרי (עוף/בקר/הודו) — אל תוסיף גבינות/יוגורט. (דג עם חלב — מותר.)
- **גיוון:** אל תחזור על אותה ארוחה שוב ושוב. בכל פעם הצע שילוב שונה ומגוון מתוך התחליפים.
- שמור על שפה תיאבונית וקצרה — שהמשתמש ירצה לאכול את זה.

# פרופיל המשתמש
שם: ${name ?? "—"} · מגדר: ${genderHe}${goal ? ` · מטרה: ${goal}` : ""}${weight ? ` · משקל: ${weight} ק"ג` : ""}${height ? ` · גובה: ${height} ס"מ` : ""}${age ? ` · גיל: ${age}` : ""}

# מצב היום
${todaySummary}

# ספר הידע (כל המידע הזמין)
${knowledge}`;

  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1400,
      temperature: 0.4,
    });
    return Response.json({ message: completion.choices[0].message.content ?? "" });
  } catch (e) {
    console.error("[chat] completion error:", (e as Error).message);
    return Response.json({ message: "מצטער, אירעה שגיאה. נסה שוב." }, { status: 500 });
  }
}
