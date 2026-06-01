"use client";

import { useState, useEffect } from "react";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function useToday() {
  const [today, setToday] = useState(todayStr);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => setToday(todayStr()), ms);
    return () => clearTimeout(timer);
  }, [today]);

  return today;
}
