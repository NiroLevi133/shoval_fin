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
        setUserState(JSON.parse(stored));
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
