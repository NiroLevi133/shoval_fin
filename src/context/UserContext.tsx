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
  logsVersion: number;
  refreshLogs: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
  logsVersion: 0,
  refreshLogs: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logsVersion, setLogsVersion] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("fitmeal_user");
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        setUserState(u);
        // One-time migration: push localStorage logs to DB if not yet synced
        if (!localStorage.getItem("fitmeal_synced_v1")) {
          syncLocalStorageToDb(u.phone).then((count) => {
            if (count > 0) localStorage.setItem("fitmeal_synced_v1", "1");
          });
        }
      } catch {
        localStorage.removeItem("fitmeal_user");
      }
    }
    setIsLoading(false);
  }, []);

  const setUser = (u: User) => {
    setUserState(u);
    localStorage.setItem("fitmeal_user", JSON.stringify(u));
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem("fitmeal_user");
  };

  const refreshLogs = useCallback(() => {
    setLogsVersion((v) => v + 1);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading, logsVersion, refreshLogs }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);

async function syncLocalStorageToDb(phone: string): Promise<number> {
  try {
    const prefix = `fitmeal_logs_${phone}_`;
    const allLogs: object[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entries = JSON.parse(raw) as object[];
      allLogs.push(...entries);
    }
    if (!allLogs.length) return 0;
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, logs: allLogs }),
    });
    const { synced } = await res.json() as { synced: number };
    return synced;
  } catch { return 0; }
}
