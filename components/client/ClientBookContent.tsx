"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClientMasterSkeleton,
  ClientNotFound,
} from "@/components/client/ClientMasterView";
import {
  addDays,
  formatDateKey,
  formatMonthYear,
  formatTime,
  getCalendarGrid,
  parseDateKey,
} from "@/lib/dates";
import { formatPhoneInput, normalizeUaPhone } from "@/lib/phone";
import { isWorkingDay } from "@/lib/working-hours";
import { cn } from "@/lib/utils";
import type { BookingSlot, PublicMasterProfile } from "@/types";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
} from "lucide-react";

type ClientBookContentProps = {
  slug: string;
};

function getTelegramUserId(): number | null {
  if (typeof window === "undefined") return null;
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return typeof id === "number" ? id : null;
}

export function ClientBookContent({ slug }: ClientBookContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get("service");

  const [profile, setProfile] = useState<PublicMasterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState(() => new Date());

  const timeZone = profile?.timezone ?? "Europe/Kyiv";
  const selectedService = profile?.services.find((s) => s.id === serviceId);
  const todayKey = formatDateKey(new Date(), timeZone);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/public/masters/${encodeURIComponent(slug)}`,
        );
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) {
          setProfile(data.master);
          setNotFound(false);
          if (preselectedServiceId) {
            setServiceId(preselectedServiceId);
          } else if (data.master.services.length === 1) {
            setServiceId(data.master.services[0].id);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, preselectedServiceId]);

  useEffect(() => {
    if (!profile) return;

    const telegramId = getTelegramUserId();
    if (!telegramId) return;

    let cancelled = false;

    async function loadCustomer() {
      try {
        const data = await apiFetch<{
          customer: { name: string; phone: string | null } | null;
        }>(`/api/public/masters/${encodeURIComponent(slug)}/customer`);
        if (cancelled || !data.customer) return;
        setClientName((prev) => prev || data.customer!.name);
        setClientPhone((prev) => prev || data.customer!.phone || "");
      } catch {
        // Клієнт ще не зареєстрований — це нормально
      }
    }

    loadCustomer();
    return () => {
      cancelled = true;
    };
  }, [profile, slug]);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !selectedDate) return;

    try {
      setSlotsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/public/masters/${encodeURIComponent(slug)}/slots?date=${encodeURIComponent(selectedDate)}&service_id=${encodeURIComponent(serviceId)}`,
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
  }, [slug, serviceId, selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

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
    const trimmedName = clientName.trim();
    if (!trimmedName) {
      setError("Введіть ім'я");
      return;
    }

    const normalizedPhone = normalizeUaPhone(clientPhone.trim());
    if (!normalizedPhone) {
      setError("Введіть коректний номер телефону");
      return;
    }

    if (!profile || !serviceId || !selectedSlot) {
      setError("Оберіть послугу, дату та час");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const telegramId = getTelegramUserId();
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          master_id: profile.id,
          service_id: serviceId,
          booking_start: selectedSlot.start,
          client_name: trimmedName,
          client_phone: normalizedPhone,
          telegram_id: telegramId,
        }),
      });
      router.push(`/client/${encodeURIComponent(slug)}/success`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити запис");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ClientMasterSkeleton />;
  if (notFound || !profile) return <ClientNotFound />;

  if (profile.services.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <Calendar className="mx-auto h-12 w-12 text-zinc-300" />
        <h1 className="text-lg font-semibold">Запис недоступний</h1>
        <p className="text-sm text-zinc-500">
          У майстра поки немає послуг для запису
        </p>
        <Link href={`/client/${encodeURIComponent(slug)}`}>
          <Button variant="outline">Назад до профілю</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Link
          href={`/client/${encodeURIComponent(slug)}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Запис до {profile.business_name}
          </h1>
          <p className="text-xs text-zinc-500">Оберіть послугу, дату та час</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          1. Послуга
        </h2>
        <ul className="space-y-2">
          {profile.services.map((service) => {
            const selected = service.id === serviceId;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setServiceId(service.id);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                  setSlots([]);
                }}
                className={cn(
                  "w-full rounded-[14px] border p-4 text-left transition-all",
                  selected
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {service.name}
                    </p>
                    <p className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
                      <span>{service.price} грн</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {service.duration_minutes} хв
                      </span>
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-5 w-5 shrink-0 text-zinc-900 dark:text-zinc-100" />
                  )}
                </div>
              </button>
            );
          })}
        </ul>
      </section>

      {serviceId && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            2. Дата
          </h2>
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between">
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
                  return <div key={`empty-${index}`} className="aspect-square" />;
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
                            ? "bg-emerald-50 text-zinc-900 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-zinc-100 dark:hover:bg-emerald-950/60"
                            : "text-zinc-400",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {selectedDate && selectedService && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            3. Час
          </h2>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <Card>
              <p className="py-4 text-center text-sm text-zinc-500">
                На цей день немає вільних слотів. Оберіть іншу дату.
              </p>
            </Card>
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
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                    )}
                  >
                    {formatTime(slot.start, timeZone)}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedSlot && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            4. Ваші дані
          </h2>
          <Card className="space-y-3">
            <div>
              <label
                htmlFor="client-name"
                className="mb-1.5 block text-xs text-zinc-500"
              >
                Ім&apos;я <span className="text-red-500">*</span>
              </label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ваше ім'я"
                autoComplete="name"
              />
            </div>
            <div>
              <label
                htmlFor="client-phone"
                className="mb-1.5 block text-xs text-zinc-500"
              >
                Телефон <span className="text-red-500">*</span>
              </label>
              <Input
                id="client-phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(formatPhoneInput(e.target.value))}
                placeholder="+380..."
                autoComplete="tel"
                required
              />
            </div>
          </Card>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Створюємо запис...
              </>
            ) : (
              "Підтвердити запис"
            )}
          </Button>
        </section>
      )}
    </div>
  );
}
