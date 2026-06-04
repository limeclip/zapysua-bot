"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { BookingList } from "@/components/bookings/BookingList";
import { toIsoRangeEnd, toIsoRangeStart } from "@/lib/dates";
import { isSubscriptionActive } from "@/lib/subscription";
import type {
  BookingStatistics,
  BookingWithService,
  MasterWithMeta,
} from "@/types";
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
  onNavigateTab: (tab: TabId) => void;
};

export function HomeTab({ master, onNavigateTab }: HomeTabProps) {
  const timeZone = master.timezone || "Europe/Kyiv";

  const [todayBookings, setTodayBookings] = useState<BookingWithService[]>([]);
  const [weekStats, setWeekStats] = useState<BookingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSubscriptionActive(master.subscription)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = new Date();

      const [bookingsRes, statsRes] = await Promise.all([
        apiFetch<{ bookings: BookingWithService[] }>(
          `/api/bookings?start_date=${encodeURIComponent(toIsoRangeStart(today, timeZone))}&end_date=${encodeURIComponent(toIsoRangeEnd(today, timeZone))}`,
        ),
        apiFetch<{ statistics: BookingStatistics }>(
          "/api/statistics?period=week",
        ),
      ]);

      setTodayBookings(bookingsRes.bookings);
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
    setTodayBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    );
    load();
  };

  const handleBookingDeleted = (id: string) => {
    setTodayBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Вітаємо, {master.business_name}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Сьогоднішні записи
        </p>
      </div>

      <SubscriptionGate master={master}>
        {error && <ApiErrorState message={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                {new Date().toLocaleDateString("uk-UA", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone,
                })}
              </p>
              <Link href="/bookings">
                <Button variant="ghost" size="sm">
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
              <BookingList
                bookings={todayBookings}
                timeZone={timeZone}
                onBookingUpdated={handleBookingUpdated}
                onBookingDeleted={handleBookingDeleted}
                compact
              />
            )}

            {weekStats && (
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center">
                  <p className="text-lg font-semibold">
                    {weekStats.total_bookings}
                  </p>
                  <p className="text-[10px] text-zinc-500">За тиждень</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-lg font-semibold">
                    {weekStats.confirmed_percent}%
                  </p>
                  <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-0.5">
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
                  <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-0.5">
                    <CircleDollarSign className="h-3 w-3" />
                    {weekStats.revenue != null ? "грн" : "Виручка"}
                  </p>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-auto flex-col gap-1 py-3"
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
          </>
        )}
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
