"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notifications";

interface FlagPayload {
  questionId: string;
  attemptId?: string;
  isFlagged: boolean;
}

interface MutationContext {
  previousFlagged: boolean;
}

export function useQuestionFlag({
  questionId,
  attemptId,
  initialFlagged = false,
}: {
  questionId: string;
  attemptId?: string;
  initialFlagged?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["question-flag", attemptId || "global", questionId];

  // Query state with initial data and 5-min staleTime
  const { data: isFlagged = initialFlagged } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const url = attemptId
          ? `/api/attempts/${encodeURIComponent(attemptId)}/questions/${encodeURIComponent(questionId)}/flag`
          : `/api/questions/${encodeURIComponent(questionId)}/flag`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.isFlagged === "boolean") return data.isFlagged;
        }
      } catch {
        // graceful offline fallback
      }
      return queryClient.getQueryData<boolean>(queryKey) ?? initialFlagged;
    },
    initialData: initialFlagged,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation<boolean, Error, boolean, MutationContext>({
    mutationFn: async (nextFlagState: boolean) => {
      const url = attemptId
        ? `/api/attempts/${encodeURIComponent(attemptId)}/questions/${encodeURIComponent(questionId)}/flag`
        : `/api/questions/${encodeURIComponent(questionId)}/flag`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFlagged: nextFlagState }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update question flag: HTTP ${res.status}`);
      }

      const data = await res.json();
      return typeof data.isFlagged === "boolean" ? data.isFlagged : nextFlagState;
    },
    // Optimistic Update Lifecycle
    onMutate: async (nextFlagState: boolean): Promise<MutationContext> => {
      // 1. Cancel in-flight queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey });

      // 2. Snapshot the previous flag state
      const previousFlagged = queryClient.getQueryData<boolean>(queryKey) ?? isFlagged;

      // 3. Optimistically set the new value in the cache
      queryClient.setQueryData<boolean>(queryKey, nextFlagState);

      // 4. Return context containing the snapshot
      return { previousFlagged };
    },
    onSuccess: (data: boolean) => {
      queryClient.setQueryData<boolean>(queryKey, data);
    },
    // Rollback to snapshot on error
    onError: (_err, _nextFlagState, context) => {
      if (context) {
        queryClient.setQueryData<boolean>(queryKey, context.previousFlagged);
      }
      notify.error("Unable to update question flag. Check your connection.");
    },
  });

  const toggleFlag = () => {
    mutation.mutate(!isFlagged);
  };

  return {
    isFlagged,
    toggleFlag,
    setFlag: (flagged: boolean) => mutation.mutate(flagged),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
