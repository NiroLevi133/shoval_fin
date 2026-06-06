// FitMeal AI — טיפוסים (מודל מבוסס מבנה-ארוחה + מעקב + RAG)

export type MealType = "breakfast" | "snack1" | "lunch" | "snack2" | "dinner";

export const MEAL_ORDER: MealType[] = ["breakfast", "snack1", "lunch", "snack2", "dinner"];

export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;
export type DayName = (typeof DAY_NAMES)[number];

export type User = {
  name: string;
  phone: string;
  gender?: "male" | "female";
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
};

// ── תוכן ──────────────────────────────────────────────────────
export type FoodGroup = {
  id: number;
  key: string; // carbs / fruits / vegetables / dairy_protein / meat_protein / fats / off_routine
  name: string;
  note?: string | null;
  sort_order: number;
  items: SubstitutionItem[];
};

export type SubstitutionItem = {
  id: number;
  group_id: number;
  text: string;
  is_star: boolean;
  sort_order: number;
};

export type RequiredPortion = { group: string; qty: string; alt?: string };

export type MealTemplate = {
  meal_type: MealType;
  label: string;
  required_text: string;
  required_portions: RequiredPortion[];
  examples: string[];
};

export type WeeklyMenuRow = {
  day: DayName;
  meal_type: MealType;
  description: string;
  calories: number | null;
};

export type DayMenu = {
  day: DayName;
  meals: Array<{
    meal_type: MealType;
    label: string;
    required_text: string;
    required_portions: RequiredPortion[];
    example: string; // הדוגמה הקונקרטית של היום (מהתפריט השבועי)
    calories: number | null;
  }>;
};

export type Qna = { question: string; answer: string };

// ── מעקב משתמש ────────────────────────────────────────────────
export type MealCompletion = {
  id?: number;
  user_phone: string;
  date: string;
  meal_type: MealType;
  eaten: boolean;
  source: "manual" | "photo";
  photo_items?: Array<{ text: string }> | null;
};

export type Measurement = {
  id?: number;
  user_phone: string;
  date: string;
  weight?: number | null;
  circumferences?: Record<string, number> | null;
  photo_url?: string | null;
  note?: string | null;
};

export type ProgressStats = {
  dailyPct: number; // % עמידה היום (ארוחות שסומנו / 5)
  weeklyPct: number; // % עמידה ב-7 ימים אחרונים
  streak: number; // רצף ימים
  mealsDone: number; // סה"כ ארוחות שבוצעו (טווח)
  mealsSkipped: number; // סה"כ דולגו (טווח)
  byDate: Record<string, number>; // date -> מספר ארוחות שבוצעו
};
