"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { BookingList } from "@/components/bookings/BookingList";
import { CreateBookingModal } from "@/components/bookings/CreateBookingModal";
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
import { ChevronLeft, ChevronRight, Clock, Plus, X } from "lucide-react";
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
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  const bookingCountsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      const key = formatDateKey(new Date(b.booking_start), timeZone);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
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

  const handleBookingCreated = (booking: BookingWithService) => {
    setBookings((prev) =>
      [...prev, booking].sort(
        (a, b) =>
          new Date(a.booking_start).getTime() -
          new Date(b.booking_start).getTime(),
      ),
    );
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
      <Button className="w-full" onClick={() => setCreateModalOpen(true)}>
        <Plus className="h-4 w-4" />
        Створити запис вручну
      </Button>

      <CreateBookingModal
        master={master}
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleBookingCreated}
        defaultDate={selectedDay ?? undefined}
      />

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
              const dayBookingCount = bookingCountsByDay[key] ?? 0;
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
                  {dayBookingCount > 0 && (
                    <span
                      className={cn(
                        "absolute right-0.5 top-0.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-0.5 text-xs font-semibold leading-none",
                        isSelected
                          ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                          : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
                      )}
                    >
                      {dayBookingCount} 
                    </span>
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
          <Card className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-visible animate-in fade-in">
            <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
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
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">
              <BookingList
                bookings={selectedBookings}
                timeZone={timeZone}
                onBookingUpdated={handleBookingUpdated}
                onBookingDeleted={handleBookingDeleted}
                compact
                contextDay={selectedDay}
              />
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full shrink-0"
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
