# FitMeal AI — מדריך הקמה (גרסה חדשה)

המערכת נבנתה מחדש: מבנה-ארוחה + תחליפים דינמיים + מעקב סימון + AI תזונאי מבוסס RAG.
כדי שתרוץ, יש לבצע **3 פעולות חד-פעמיות** ואז להריץ seed.

## 1. הוספת מפתח Service Role ל-`.env.local`
ב-Supabase → **Settings → API** → העתק את `service_role` key, והוסף ל-`fitmeal-ai/.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # ה-service_role (סודי! לא לחשוף בצד לקוח)
```

(שאר המפתחות כבר קיימים: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`.)

## 2. הפעלת pgvector + יצירת הסכמה
ב-Supabase → **SQL Editor** → הדבק והרץ את כל התוכן של `supabase/schema.sql`.
(זה כולל `create extension vector`, כל הטבלאות, ופונקציית `match_doc_chunks` ל-RAG.)

## 3. הרצת ה-seed (טעינת כל התוכן + embeddings)
מתוך תיקיית `fitmeal-ai`:

```bash
npm install
npm run seed
```

הסקריפט טוען: 7 קבוצות תחליפים, מבנה 5 ארוחות + דוגמאות, תפריט שבועי (35 שורות),
16 שאלות-תשובות, ומחשב embeddings ל-RAG. פלט צפוי: `✅ seed הושלם בהצלחה!`

## הרצה
```bash
npm run dev      # פיתוח → http://localhost:3000
npm run build    # בנייה לפרודקשן
```

---

## עדכון תוכן בעתיד
התפריט/תחליפים/שו"ת חיים ב-`scripts/seedData.ts` (מקור אמת מתומלל מתיקיית `data/`).
לעדכון: ערוך את הקובץ והרץ שוב `npm run seed` (ה-seed מנקה ומטעין מחדש את טבלאות התוכן בלבד —
לא נוגע בנתוני משתמשים: `users`, `meal_completions`, `measurements`).

## מבנה
| שכבה | קבצים |
|---|---|
| סכמה | `supabase/schema.sql` |
| seed | `scripts/seedData.ts`, `scripts/seed.ts` |
| API | `src/app/api/{menu,subs,completions,progress,measurements,users,chat,scan}` |
| מסכים | `src/app/{page,week,subs,progress,ai,profile,onboarding}` |
| משותף | `src/components/{BottomNav,MealCard,ProgressRing,ScanResultSheet}`, `src/lib/*` |

## הערה על טבלאות ישנות
טבלאות `food_logs` ו-`daily_summaries` מהגרסה הקודמת אינן בשימוש עוד.
ניתן למחוק אותן ב-Supabase כשתרצה (לא חובה — הן פשוט יושבות ללא שימוש).
