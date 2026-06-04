"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { BookingList } from "@/components/bookings/BookingList";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_FILTER_LABELS } from "@/lib/booking-status";
import type { BookingStatus, BookingWithService, MasterWithMeta } from "@/types";

const FILTERS: { id: BookingStatus | "all"; label: string }[] = (
  ["all", "pending", "confirmed", "cancelled", "no_show"] as const
).map((id) => ({
  id,
  label: BOOKING_STATUS_FILTER_LABELS[id],
}));

export function BookingsPageContent({ master }: { master: MasterWithMeta }) {
  const timeZone = master.timezone || "Europe/Kyiv";
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const qs =
        filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const data = await apiFetch<{ bookings: BookingWithService[] }>(
        `/api/bookings${qs}`,
      );
      setBookings(
        [...data.bookings].sort(
          (a, b) =>
            new Date(b.booking_start).getTime() -
            new Date(a.booking_start).getTime(),
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBookingUpdated = (updated: BookingWithService) => {
    if (filter !== "all" && updated.status !== filter) {
      setBookings((prev) => prev.filter((b) => b.id !== updated.id));
    } else {
      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );
    }
  };

  const handleBookingDeleted = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <SubscriptionGate master={master}>
      <div className="space-y-4 animate-in fade-in">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <ApiErrorState message={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <BookingList
            bookings={bookings}
            timeZone={timeZone}
            onBookingUpdated={handleBookingUpdated}
            onBookingDeleted={handleBookingDeleted}
          />
        )}
      </div>
    </SubscriptionGate>
  );
}
