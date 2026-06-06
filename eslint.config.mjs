import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // דפוס טעינת-נתונים בתוך useEffect (fetch + setState) הוא לגיטימי כאן —
      // הכלל החדש אגרסיבי מדי עבורו. משאירים כאזהרה במקום שגיאה.
      "react-hooks/set-state-in-effect": "warn",
      // כללי React Compiler ייעוציים (אופטימיזציה) — אזהרה, לא שגיאה.
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
