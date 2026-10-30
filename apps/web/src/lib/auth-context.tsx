"use client";

import * as React from "react";
import type { SignInInput, SignUpInput } from "@/lib/validation/auth";
import { mapAuthHttpStatusToMessage } from "@/lib/error-mapping";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: string;
  pathway: "rn" | "pn" | "both";
  picture?: string;
  provider?: string;
  activePlan?: string;
  targetExamDate?: string;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSession();
  }, [fetchSession]);

  const login = async (data: SignInInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let resData: { success?: boolean; user?: AuthUser; error?: string } | null = null;
      try {
        resData = await res.json();
      } catch {
        resData = null;
      }

      if (!res.ok || !resData?.success) {
        const errorMsg =
          mapAuthHttpStatusToMessage(res.status, resData?.error) ||
          "The email or password is incorrect.";
        return { success: false, error: errorMsg };
      }

      setUser(resData.user || null);
      return { success: true };
    } catch (err) {
      console.error("Login exception:", err);
      return {
        success: false,
        error: "We are temporarily unable to reach the authentication service. Please try again shortly.",
      };
    }
  };

  const registerUser = async (data: SignUpInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let resData: { success?: boolean; user?: AuthUser; error?: string } | null = null;
      try {
        resData = await res.json();
      } catch {
        resData = null;
      }

      if (!res.ok || !resData?.success) {
        const errorMsg =
          mapAuthHttpStatusToMessage(res.status, resData?.error) ||
          "Failed to create account. Please review your details.";
        return { success: false, error: errorMsg };
      }

      setUser(resData.user || null);
      return { success: true };
    } catch (err) {
      console.error("Registration exception:", err);
      return {
        success: false,
        error: "We are temporarily unable to reach the authentication service. Please try again shortly.",
      };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout exception:", err);
    } finally {
      setUser(null);
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

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ success: false, error: "Auth provider not active" }),
  registerUser: async () => ({ success: false, error: "Auth provider not active" }),
  logout: async () => {},
  refreshSession: async () => {},
};

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    return defaultAuthContext;
  }
  return context;
}
