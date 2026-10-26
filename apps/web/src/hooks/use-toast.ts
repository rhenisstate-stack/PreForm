import * as React from "react";
import { toast } from "sonner";

export function useToast() {
  return {
    toast: (...args: Parameters<typeof toast>) => {
      return toast(...args);
    },
  };
}
