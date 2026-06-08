"use client";

import { useMemo, useState } from "react";
import { BookingList } from "@/components/bookings/BookingList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  countCountableBookings,
  groupBookingsByDateKey,
} from "@/lib/bookings-group";
import {
  addDays,
  formatDateKey,
  formatDateLong,
  startOfWeek,
} from "@/lib/dates";
import {
  hasWorkingHoursConfigured,
  isWorkingDay,
  parseWorkingHours,
} from "@/lib/working-hours";
import { cn } from "@/lib/utils";
import type { BookingWithService, MasterWithMeta } from "@/types";
import { X } from "lucide-react";

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

type WeekCalendarProps = {
  master: MasterWithMeta;
  weekBookings: BookingWithService[];
  loading?: boolean;
  timeZone: string;
  onBookingUpdated: (booking: BookingWithService) => void;
  onBookingDeleted?: (id: string) => void;
};

export function WeekCalendar({
  master,
  weekBookings,
  loading = false,
  timeZone,
  onBookingUpdated,
  onBookingDeleted,
}: WeekCalendarProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const workingHours = useMemo(
    () => parseWorkingHours(master.working_hours),
    [master.working_hours],
  );
  const hoursConfigured = hasWorkingHoursConfigured(workingHours);
  const todayKey = formatDateKey(new Date(), timeZone);

  const bookingsByDate = useMemo(
    () => groupBookingsByDateKey(weekBookings, timeZone),
    [weekBookings, timeZone],
  );

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), timeZone);
    return WEEKDAY_LABELS.map((label, index) => {
      const date = addDays(weekStart, index);
      const dateKey = formatDateKey(date, timeZone);
      const dayBookings = bookingsByDate.get(dateKey) ?? [];
      return {
        label,
        dateKey,
        isToday: dateKey === todayKey,
        isWorking: hoursConfigured && isWorkingDay(dateKey, workingHours),
        count: countCountableBookings(dayBookings),
        bookings: dayBookings,
      };
    });
  }, [
    bookingsByDate,
    hoursConfigured,
    timeZone,
    todayKey,
    workingHours,
  ]);

  const selectedDay = weekDays.find((day) => day.dateKey === selectedDateKey);

  const handleBookingUpdated = (booking: BookingWithService) => {
    onBookingUpdated(booking);
  };

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="flex min-w-[3rem] flex-1 flex-col items-center">
              <Skeleton className="mt-1 h-3 w-6" />
            <Skeleton className="h-10 w-10 rounded-full mt-1" />
            {/* <Skeleton className="mt-2 h-3 w-6" /> */}
          
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {!hoursConfigured && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Налаштуйте робочі години в розділі «Налаштування»
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto   pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weekDays.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => setSelectedDateKey(day.dateKey)}
            className="flex min-w-[3rem] flex-1 flex-col items-center text-center"
          >
            <div className={cn(
              "p-2 hover:bg-background rounded-xl hover:shadow-sm hover:border hover:border-border/40 border border-transparent",
              day.isToday &&
              "bg-background border border-border/40 rounded-xl shadow-sm dark:shadow-zinc-800",
              )}>
              <div>
                <span className="text-sm text-muted-foreground font-semibold">
                  {day.label}
                </span>
              </div>
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  !day.isWorking
                    ? "border-red-400 border-2 dark:border-red-400"
                    : day.count === 0
                      ? "border-gray-400 border-2 dark:border-zinc-500"
                      : "border-green-500 border-2 dark:border-green-600",
                  day.isToday &&
                  "border-3 bg-background",
                )}
                aria-hidden
              >
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {day.count}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedDateKey && selectedDay && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="week-day-bookings-title"
        >
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto animate-in fade-in">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 id="week-day-bookings-title" className="font-semibold">
                Записи: {formatDateLong(selectedDateKey)}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDateKey(null)}
                aria-label="Закрити"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {selectedDay.bookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                Записів на цей день немає
              </p>
            ) : (
              <BookingList
                bookings={selectedDay.bookings}
                timeZone={timeZone}
                onBookingUpdated={handleBookingUpdated}
                onBookingDeleted={onBookingDeleted}
                contextDay={selectedDateKey}
              />
            )}
          </Card>
        </div>
      )}
    </>
  );
}
