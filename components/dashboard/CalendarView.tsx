"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { BookingList } from "@/components/bookings/BookingList";
import {
  endOfMonth,
  formatBookingCount,
  formatDateKey,
  formatDateLong,
  formatMonthYear,
  getCalendarGrid,
  startOfMonth,
  toIsoRangeEnd,
  toIsoRangeStart,
} from "@/lib/dates";
import {
  hasWorkingHoursConfigured,
  parseWorkingHours,
} from "@/lib/working-hours";
import { cn } from "@/lib/utils";
import type { BookingWithService, MasterWithMeta } from "@/types";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import Link from "next/link";

type CalendarViewProps = {
  master: MasterWithMeta;
  onOpenSettings?: () => void;
};

export function CalendarView({ master, onOpenSettings }: CalendarViewProps) {
  const timeZone = master.timezone || "Europe/Kyiv";
  const workingHours = parseWorkingHours(master.working_hours);
  const hoursConfigured = hasWorkingHoursConfigured(workingHours);

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date(), timeZone));
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadMonth = useCallback(async () => {
    try {
      setLoading(true);
      const monthEnd = endOfMonth(viewMonth, timeZone);
      const data = await apiFetch<{ bookings: BookingWithService[] }>(
        `/api/bookings?start_date=${encodeURIComponent(toIsoRangeStart(viewMonth, timeZone))}&end_date=${encodeURIComponent(toIsoRangeEnd(monthEnd, timeZone))}`,
      );
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Помилка завантаження";
      if (msg.includes("підписк") || msg.includes("subscription")) {
        setError("subscription");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [viewMonth, timeZone]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const daysWithBookings = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      set.add(formatDateKey(new Date(b.booking_start), timeZone));
    }
    return set;
  }, [bookings, timeZone]);

  const { days, weekdayLabels } = getCalendarGrid(viewMonth);
  const todayKey = formatDateKey(new Date(), timeZone);

  const selectedBookings = useMemo(() => {
    if (!selectedDay) return [];
    return bookings
      .filter(
        (b) => formatDateKey(new Date(b.booking_start), timeZone) === selectedDay,
      )
      .sort(
        (a, b) =>
          new Date(a.booking_start).getTime() -
          new Date(b.booking_start).getTime(),
      );
  }, [bookings, selectedDay, timeZone]);

  const handleBookingUpdated = (updated: BookingWithService) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    );
  };

  const handleBookingDeleted = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  if (!hoursConfigured) {
    return (
      <Card className="text-center">
        <Clock className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
        <h3 className="mb-2 font-medium">Робочі години не налаштовані</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Додайте графік роботи, щоб календар коректно показував доступність.
        </p>
        {onOpenSettings ? (
          <Button variant="outline" onClick={onOpenSettings}>
            Відкрити налаштування
          </Button>
        ) : (
          <Link href="/?tab=settings">
            <Button variant="outline">Відкрити налаштування</Button>
          </Link>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
            )
          }
          aria-label="Попередній місяць"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm font-semibold">{formatMonthYear(viewMonth)}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
            )
          }
          aria-label="Наступний місяць"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {error && error !== "subscription" && (
        <ApiErrorState message={error} onRetry={loadMonth} />
      )}

      <Card className="p-3">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-medium text-zinc-400"
            >
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              const key = formatDateKey(day, timeZone);
              const hasBookings = daysWithBookings.has(key);
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : isToday
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
                  )}
                >
                  {day.getDate()}
                  {hasBookings && (
                    <span
                      className={cn(
                        "absolute bottom-1 h-1 w-1 rounded-full",
                        isSelected
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-zinc-900 dark:bg-zinc-100",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selectedDay && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <Card className="max-h-[70vh] w-full max-w-lg overflow-y-auto animate-in fade-in">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">{formatDateLong(selectedDay)}</h3>
                <p className="text-xs text-zinc-500">
                  {formatBookingCount(selectedBookings.length)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDay(null)}
                aria-label="Закрити"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <BookingList
              bookings={selectedBookings}
              timeZone={timeZone}
              onBookingUpdated={handleBookingUpdated}
              onBookingDeleted={handleBookingDeleted}
              compact
              contextDay={selectedDay}
            />
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setSelectedDay(null)}
            >
              Закрити
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
