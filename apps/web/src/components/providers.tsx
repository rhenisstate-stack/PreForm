"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { NotificationsProvider } from "@/lib/notifications-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export function Providers({ children, ...themeProps }: { children: React.ReactNode } & NextThemesProviderProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <NotificationsProvider>{children}</NotificationsProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
