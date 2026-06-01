export type User = {
  name: string;
  phone: string;
  gender?: "male" | "female";
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
  calorie_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
};

export type Meal = {
  label: string;
  description: string;
  calories: number;
};

export type DayPlan = {
  breakfast: Meal;
  snack1: Meal;
  lunch: Meal;
  snack2: Meal;
  dinner: Meal;
};

export type MealKey = keyof DayPlan;

export type FoodLog = {
  id: string;
  user_phone: string;
  date: string;
  meal_type: string;
  description: string;
  calories: number;
  protein: number;
  eaten: boolean;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  user_phone: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type SubstitutionGroup = {
  group: string;
  note: string;
  items: string[];
};

export type QnA = {
  q: string;
  a: string;
};
