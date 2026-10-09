import { useState, type ReactNode } from "react";
import { api, clearSession, getStoredUser, getToken, saveSession } from "../lib/api";
import type { User } from "../types";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<User | null>(getStoredUser());

  async function login(email: string, password: string) {
    const res = await api<{ data: { token: string; user: User } }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    saveSession(res.data.token, res.data.user);
    setToken(res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    clearSession();
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}