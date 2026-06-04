"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function ApiErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-red-200/80 bg-red-50 px-4 py-4 text-center dark:border-red-900/50 dark:bg-red-950/30">
      <AlertCircle className="mx-auto mb-2 h-5 w-5 text-red-500" />
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          Спробувати знову
        </Button>
      )}
    </div>
  );
}
