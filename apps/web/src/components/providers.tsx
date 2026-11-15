"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { SplashScreen } from "@/components/layout/splash-screen";

const DeferredToaster = dynamic(
  () => import("@/components/ui/sonner").then((m) => m.Toaster),
  { ssr: false }
);

function WorkspaceSplashGate() {
  const pathname = usePathname();
  const isWorkspaceRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/learner") ||
    pathname?.startsWith("/profile");

  if (!isWorkspaceRoute) {
    return null;
  }
  return <SplashScreen />;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Standard queries are considered fresh for 5 minutes to avoid cognitive interruptions
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a new client
    return makeQueryClient();
  }
  // Browser: keep singleton
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children, ...themeProps }: { children: React.ReactNode } & NextThemesProviderProps) {
  const [queryClient] = React.useState(() => getQueryClient());

  return (
    <NextThemesProvider {...themeProps}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <NotificationsProvider>
              <React.Suspense fallback={null}>
                <WorkspaceSplashGate />
              </React.Suspense>
              {children}
              <DeferredToaster position="top-center" richColors />
            </NotificationsProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
