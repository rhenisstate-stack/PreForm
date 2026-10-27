"use client";

import * as React from "react";
import type { SignInInput, SignUpInput } from "@/lib/validation/auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: string;
  pathway: "rn" | "pn";
  picture?: string;
  provider?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: SignInInput) => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: SignUpInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to load auth session:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = async (data: SignInInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || "Failed to sign in. Please verify your credentials." };
      }

      setUser(resData.user);
      return { success: true };
    } catch (err) {
      console.error("Login exception:", err);
      return { success: false, error: "An unexpected network error occurred." };
    }
  };

  const registerUser = async (data: SignUpInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || "Failed to create account. Please check your inputs." };
      }

      setUser(resData.user);
      return { success: true };
    } catch (err) {
      console.error("Registration exception:", err);
      return { success: false, error: "An unexpected network error occurred." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout exception:", err);
    } finally {
      setUser(null);
      // Trigger hard or client redirect if needed
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerUser,
        logout,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
