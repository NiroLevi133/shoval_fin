"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@/types";

type UserContextType = {
  user: User | null;
  setUser: (u: User) => void;
  logout: () => void;
  isLoading: boolean;
  version: number; // עולה בכל שינוי נתונים — מסכים מאזינים לרענון
  refresh: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
  version: 0,
  refresh: () => {},
});

const STORAGE_KEY = "fitmeal_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        setUserState(u);
        // רענון הפרופיל מה-DB ברקע (מקור אמת)
        fetch(`/api/users?phone=${encodeURIComponent(u.phone)}`)
          .then((r) => r.json())
          .then(({ user: dbUser }: { user: User | null }) => {
            if (dbUser) {
              setUserState(dbUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(dbUser));
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setUser = (u: User) => {
    setUserState(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    // שמירה ל-DB (fire-and-forget)
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(u),
    }).catch(() => {});
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading, version, refresh }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
