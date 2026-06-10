"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { BookingList } from "@/components/bookings/BookingList";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { PendingBookingsCard } from "@/components/dashboard/PendingBookingsCard";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookingWithService, MasterWithMeta } from "@/types";
import type { TabId } from "@/components/shared/TabBar";
import { List } from "lucide-react";

type BookingsTabProps = {
  master: MasterWithMeta;
  onNavigateTab: (tab: TabId, options?: { showPending?: boolean }) => void;
  showPendingList?: boolean;
  onPendingListShown?: () => void;
};

export function BookingsTab({
  master,
  onNavigateTab,
  showPendingList = false,
  onPendingListShown,
}: BookingsTabProps) {
  const timeZone = master.timezone || "Europe/Kyiv";
  const [pendingVisible, setPendingVisible] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<BookingWithService[]>(
    [],
  );
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    try {
      setPendingLoading(true);
      const data = await apiFetch<{ bookings: BookingWithService[] }>(
        "/api/bookings?status=pending",
      );
      setPendingBookings(
        [...data.bookings].sort(
          (a, b) =>
            new Date(a.booking_start).getTime() -
            new Date(b.booking_start).getTime(),
        ),
      );
      setPendingError(null);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showPendingList) {
      setPendingVisible(true);
      loadPending();
      onPendingListShown?.();
    }
  }, [showPendingList, loadPending, onPendingListShown]);

  const handleShowPending = () => {
    setPendingVisible(true);
    loadPending();
  };

  const handleBookingUpdated = (updated: BookingWithService) => {
    if (updated.status !== "pending") {
      setPendingBookings((prev) => prev.filter((b) => b.id !== updated.id));
    } else {
      setPendingBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );
    }
  };

  const handleBookingDeleted = (id: string) => {
    setPendingBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <SubscriptionGate master={master}>
      <div className="space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Календар
          </h2>
          <Link href="/bookings">
            <Button variant="ghost" size="sm">
              <List className="h-4 w-4" />
              Список
            </Button>
          </Link>
        </div>



        <CalendarView
          master={master}
          onOpenSettings={() => onNavigateTab("settings")}
        />

        <PendingBookingsCard
          master={master}
          variant="filter"
          onShowPending={handleShowPending}
        />

        {pendingVisible && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Очікують підтвердження
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingVisible(false)}
              >
                Сховати
              </Button>
            </div>

            {pendingError && (
              <ApiErrorState message={pendingError} onRetry={loadPending} />
            )}

            {pendingLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingBookings.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">
                Немає записів, що очікують підтвердження
              </p>
            ) : (
              <BookingList
                bookings={pendingBookings}
                timeZone={timeZone}
                onBookingUpdated={handleBookingUpdated}
                onBookingDeleted={handleBookingDeleted}
                compact
              />
            )}
          </div>
        )}
      </div>
    </SubscriptionGate>
  );
}
