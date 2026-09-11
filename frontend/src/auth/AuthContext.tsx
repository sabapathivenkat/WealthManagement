import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthResponse } from "../api/types";

interface AuthState {
  token: string | null;
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [name, setName] = useState<string | null>(localStorage.getItem("userName"));
  const [email, setEmail] = useState<string | null>(localStorage.getItem("userEmail"));

  const login = (auth: AuthResponse) => {
    localStorage.setItem("token", auth.token);
    localStorage.setItem("userName", auth.name);
    localStorage.setItem("userEmail", auth.email);
    setToken(auth.token);
    setName(auth.name);
    setEmail(auth.email);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setToken(null);
    setName(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, name, email, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
