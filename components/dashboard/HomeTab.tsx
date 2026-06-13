"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { BookingList } from "@/components/bookings/BookingList";
import { WeekCalendar } from "@/components/dashboard/WeekCalendar";
import {
  endOfWeek,
  formatDateKey,
  startOfWeek,
  toIsoRangeEnd,
  toIsoRangeStart,
} from "@/lib/dates";
import { isSubscriptionActive } from "@/lib/subscription";
import type {
  BookingStatistics,
  BookingWithService,
  MasterWithMeta,
} from "@/types";
import { PendingBookingsCard } from "@/components/dashboard/PendingBookingsCard";
import type { TabId } from "@/components/shared/TabBar";
import {
  Calendar,
  Calendar1,
  CircleDollarSign,
  ListPlus,
  TrendingUp,
} from "lucide-react";

type HomeTabProps = {
  master: MasterWithMeta;
  onNavigateTab: (tab: TabId, options?: { showPending?: boolean }) => void;
};

export function HomeTab({ master, onNavigateTab }: HomeTabProps) {
  const timeZone = master.timezone || "Europe/Kyiv";

  const [weekBookings, setWeekBookings] = useState<BookingWithService[]>([]);
  const [weekStats, setWeekStats] = useState<BookingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const todayKey = formatDateKey(new Date(), timeZone);

  const todayBookings = useMemo(
    () =>
      weekBookings.filter(
        (booking) =>
          formatDateKey(new Date(booking.booking_start), timeZone) === todayKey,
      ),
    [weekBookings, timeZone, todayKey],
  );

  const load = useCallback(async () => {
    if (!isSubscriptionActive(master.subscription)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = new Date();
      const weekStart = startOfWeek(today, timeZone);
      const weekEnd = endOfWeek(today, timeZone);

      const [bookingsRes, statsRes] = await Promise.all([
        apiFetch<{ bookings: BookingWithService[] }>(
          `/api/bookings?start_date=${encodeURIComponent(toIsoRangeStart(weekStart, timeZone))}&end_date=${encodeURIComponent(toIsoRangeEnd(weekEnd, timeZone))}`,
        ),
        apiFetch<{ statistics: BookingStatistics }>(
          "/api/statistics?period=week",
        ),
      ]);

      setWeekBookings(bookingsRes.bookings);
      setWeekStats(statsRes.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [master.subscription, timeZone]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBookingUpdated = (updated: BookingWithService) => {
    setWeekBookings((prev) =>
      prev.map((booking) =>
        booking.id === updated.id ? updated : booking,
      ),
    );
  };

  const handleBookingDeleted = (id: string) => {
    setWeekBookings((prev) => prev.filter((booking) => booking.id !== id));
  };

  return (
    <div className="space-y-4 animate-in fade-in relative">

      <SubscriptionGate master={master}>
        {error && <ApiErrorState message={error} onRetry={load} />}
        <WeekCalendar
          master={master}
          weekBookings={weekBookings}
          loading={loading}
          timeZone={timeZone}
          onBookingUpdated={handleBookingUpdated}
          onBookingDeleted={handleBookingDeleted}
        />

        <div className="-mt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Огляд вашого тижня
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {new Date().toLocaleDateString("uk-UA", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone,
              })}
            </p>
          </div>
        </div>

        <PendingBookingsCard
          master={master}
          onView={() => onNavigateTab("bookings", { showPending: true })}
        />

        {weekStats && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <p className="text-lg font-semibold">
                {weekStats.total_bookings}
              </p>
              <p className="text-sm text-zinc-500">За тиждень</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-lg font-semibold">
                {weekStats.confirmed_percent}%
              </p>
              <p className="text-sm text-zinc-500 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Підтверд.
              </p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-lg font-semibold">
                {weekStats.revenue != null
                  ? `${weekStats.revenue}`
                  : "—"}
              </p>
              <p className="text-sm text-zinc-500 flex items-center justify-center gap-1">
                <CircleDollarSign className="h-3 w-3" />
                {weekStats.revenue != null ? "грн" : "Виручка"}
              </p>
            </Card>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Сьогоднішні записи: {todayBookings.length}
              </p>
             
              <Link href="/bookings">
                <Button variant="ghost" size="sm" className="cursor-pointer">
                  Всі записи
                </Button>
              </Link>
            </div>

            {todayBookings.length === 0 ? (
              <Card>
                <p className="flex flex-col items-center gap-2 py-4 text-center text-sm text-zinc-500">
                  <Calendar1 className="h-5 w-5" />
                  Записів на сьогодні поки немає.
                </p>
              </Card>
            ) : (
              <>
                <BookingList
                  bookings={
                    showAll ? todayBookings : todayBookings.slice(0, 3)
                  }
                  timeZone={timeZone}
                  onBookingUpdated={handleBookingUpdated}
                  onBookingDeleted={handleBookingDeleted}
                  compact
                />
                {todayBookings.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAll((prev) => !prev)}
                  >
                    {showAll ? "Сховати" : "Показати всі записи"}
                  </Button>
                )}
              </>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-auto flex-col gap-1 py-3 cursor-pointer"
            onClick={() => onNavigateTab("services")}
          >
            <ListPlus className="h-5 w-5" />
            <span className="text-xs">Додати послугу</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-1 py-3"
            onClick={() => onNavigateTab("bookings")}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">До календаря</span>
          </Button>
        </div>
      </SubscriptionGate>

      {master.subscription?.status === "trial" && (
        <Card className="border-zinc-200 bg-zinc-50 text-center dark:border-zinc-700 dark:bg-zinc-900/80">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Пробний період активний
            {master.subscription.trial_end_date && (
              <>
                {" "}
                до{" "}
                {new Date(
                  master.subscription.trial_end_date,
                ).toLocaleDateString("uk-UA")}
              </>
            )}
          </p>
        </Card>
      )}
    </div>
  );
}
