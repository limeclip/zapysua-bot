"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addDays,
  formatDateKey,
  formatMonthYear,
  formatTime,
  getCalendarGrid,
  parseDateKey,
} from "@/lib/dates";
import { isWorkingDay } from "@/lib/working-hours";
import { cn } from "@/lib/utils";
import type { BookingSlot, ClientBooking, PublicMasterProfile } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";

type RescheduleBookingModalProps = {
  booking: ClientBooking;
  open: boolean;
  onClose: () => void;
  onRescheduled: () => void;
};

export function RescheduleBookingModal({
  booking,
  open,
  onClose,
  onRescheduled,
}: RescheduleBookingModalProps) {
  const [profile, setProfile] = useState<PublicMasterProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const timeZone = profile?.timezone ?? booking.master_timezone;
  const todayKey = formatDateKey(new Date(), timeZone);
  const slug = booking.master_slug;

  useEffect(() => {
    if (!open || !slug) return;

    let cancelled = false;

    async function loadProfile() {
      try {
        setProfileLoading(true);
        setError(null);
        const res = await fetch(
          `/api/public/masters/${encodeURIComponent(slug!)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Помилка завантаження");
        if (!cancelled) {
          setProfile(data.master);
          const bookingDate = formatDateKey(
            new Date(booking.booking_start),
            data.master.timezone ?? booking.master_timezone,
          );
          setSelectedDate(bookingDate);
          setViewMonth(parseDateKey(bookingDate));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Помилка завантаження");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [open, slug, booking.booking_start, booking.master_timezone]);

  const loadSlots = useCallback(async () => {
    if (!slug || !selectedDate || !booking.service_id) return;

    try {
      setSlotsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/public/masters/${encodeURIComponent(slug)}/slots?date=${encodeURIComponent(selectedDate)}&service_id=${encodeURIComponent(booking.service_id)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots ?? []);
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження слотів");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [slug, selectedDate, booking.service_id]);

  useEffect(() => {
    if (open) loadSlots();
  }, [open, loadSlots]);

  const { days, weekdayLabels } = useMemo(
    () => getCalendarGrid(viewMonth),
    [viewMonth],
  );

  const workingDayKeys = useMemo(() => {
    if (!profile) return new Set<string>();
    const set = new Set<string>();
    for (let offset = 0; offset < 60; offset++) {
      const day = addDays(parseDateKey(todayKey), offset);
      const key = formatDateKey(day, timeZone);
      if (isWorkingDay(key, profile.working_hours)) {
        set.add(key);
      }
    }
    return set;
  }, [profile, timeZone, todayKey]);

  const handleSubmit = async () => {
    if (!selectedSlot) {
      setError("Оберіть новий час");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          booking_start: selectedSlot.start,
          service_id: booking.service_id,
        }),
      });
      onRescheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося перенести запис");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  if (!slug) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
        <Card className="w-full max-w-md p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Перенесення недоступне для цього запису
          </p>
          <Button className="mt-4 w-full" variant="outline" onClick={onClose}>
            Закрити
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
    >
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto animate-in fade-in">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 id="reschedule-title" className="font-semibold">
            Перенести запис
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {profileLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {booking.service_name ?? "Послуга"} · {booking.business_name}
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Оберіть нову дату
              </p>
              <Card className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    aria-label="Попередній місяць"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <p className="text-sm font-semibold">
                    {formatMonthYear(viewMonth)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    aria-label="Наступний місяць"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

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

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) {
                      return (
                        <div key={`empty-${index}`} className="aspect-square" />
                      );
                    }
                    const key = formatDateKey(day, timeZone);
                    const isPast = key < todayKey;
                    const isWorking = workingDayKeys.has(key);
                    const isSelected = key === selectedDate;
                    const isDisabled = isPast || !isWorking;

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setSelectedDate(key);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : isDisabled
                              ? "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
                              : isWorking
                                ? "bg-emerald-50 text-zinc-900 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-zinc-100"
                                : "text-zinc-400",
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Оберіть новий час
                </p>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    На цей день немає вільних слотів
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const selected = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-sm font-medium transition-all",
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
                          )}
                        >
                          {formatTime(slot.start, timeZone)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              disabled={submitting || !selectedSlot}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Перенесення…
                </>
              ) : (
                "Підтвердити перенесення"
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
