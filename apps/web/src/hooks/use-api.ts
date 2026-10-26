"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Announcement } from "@/types";

export function useAnnouncements() {
  return useQuery<Announcement[], Error>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/announcements");
      if (!res.ok) throw new Error("Failed to load announcements");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });
}

export function useProgrammes() {
  return useQuery({
    queryKey: ["programmes"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/programmes");
      if (!res.ok) throw new Error("Failed to load programmes");
      return res.json();
    },
  });
}
