"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSubscriptionActive } from "@/lib/subscription";
import type { BookingWithService, MasterWithMeta } from "@/types";
import { Mail } from "lucide-react";

type PendingBookingsCardProps = {
  master: MasterWithMeta;
  onView?: () => void;
  onShowPending?: () => void;
  variant?: "navigate" | "filter";
};

export function PendingBookingsCard({
  master,
  onView,
  onShowPending,
  variant = "navigate",
}: PendingBookingsCardProps) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCount = useCallback(async () => {
    if (!isSubscriptionActive(master.subscription)) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ bookings: BookingWithService[] }>(
        "/api/bookings?status=pending",
      );
      setCount(data.bookings.length);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [master.subscription]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  if (loading || count === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <Mail className="h-5 w-5 text-amber-700 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            ✉️ {count}{" "}
            {count === 1
              ? "запис очікує"
              : count < 5
                ? "записи очікують"
                : "записів очікують"}{" "}
            підтвердження
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Клієнти чекають на вашу відповідь
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full border-amber-300 bg-white dark:border-amber-800 dark:bg-zinc-900"
            onClick={variant === "filter" ? onShowPending : onView}
          >
            {variant === "filter" ? "Очікують" : "Перейти до списку"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
