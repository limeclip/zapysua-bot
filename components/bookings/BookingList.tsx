"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-status";
import { formatBookingDateTime } from "@/lib/dates";
import type { BookingStatus, BookingWithService, Customer } from "@/types";
import {
  Check,
  CheckCircle2,
  MoreVertical,
  Phone,
  Trash2,
  User,
  UserX,
  X,
} from "lucide-react";

type BookingListProps = {
  bookings: BookingWithService[];
  timeZone: string;
  onBookingUpdated: (booking: BookingWithService) => void;
  onBookingDeleted?: (id: string) => void;
  compact?: boolean;
  contextDay?: string;
};

export function BookingList({
  bookings,
  timeZone,
  onBookingUpdated,
  onBookingDeleted,
  compact = false,
  contextDay,
}: BookingListProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuLoadingId, setMenuLoadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const updateStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      setUpdatingId(id);
      setErrorMessage(null);
      try {
        const data = await apiFetch<{ booking: BookingWithService }>(
          `/api/bookings/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );
        onBookingUpdated(data.booking);
        setSuccessMessage(
          `Статус змінено: ${BOOKING_STATUS_LABELS[status]}`,
        );
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Помилка оновлення",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [onBookingUpdated],
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setErrorMessage(null);
      try {
        await apiFetch(`/api/bookings/${id}`, { method: "DELETE" });
        onBookingDeleted?.(id);
        setSuccessMessage("Запис видалено");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Помилка видалення",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [onBookingDeleted],
  );

  const openCustomerProfile = useCallback(
    async (booking: BookingWithService) => {
      setMenuLoadingId(booking.id);
      setErrorMessage(null);
      try {
        if (booking.client_telegram_id) {
          const data = await apiFetch<{ customer: Customer | null }>(
            `/api/customers?telegram_id=${booking.client_telegram_id}`,
          );
          if (data.customer) {
            router.push(`/clients/${data.customer.id}`);
            return;
          }
        }

        const listData = await apiFetch<{
          customers: Customer[];
        }>(`/api/customers?search=${encodeURIComponent(booking.client_name)}&limit=20`);

        const byPhone = booking.client_phone
          ? listData.customers.find(
              (c) =>
                c.phone?.replace(/\s+/g, "") ===
                booking.client_phone?.replace(/\s+/g, ""),
            )
          : null;
        const byName = listData.customers.find(
          (c) => c.name.toLowerCase() === booking.client_name.toLowerCase(),
        );
        const customer = byPhone ?? byName;

        if (customer) {
          router.push(`/clients/${customer.id}`);
        } else {
          setErrorMessage("Клієнта не знайдено в базі");
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Помилка завантаження",
        );
      } finally {
        setMenuLoadingId(null);
      }
    },
    [router],
  );

  if (bookings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Записів не знайдено
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {successMessage && (
        <p className="rounded-[14px] bg-zinc-100 px-4 py-2.5 text-center text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-[14px] bg-red-50 px-4 py-2.5 text-center text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      <ul className="space-y-3">
        {bookings.map((booking) => {
          const busy =
            updatingId === booking.id ||
            deletingId === booking.id ||
            menuLoadingId === booking.id;

          return (
            <Card key={booking.id} className={compact ? "p-3" : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatBookingDateTime(booking.booking_start, timeZone, {
                      contextDay,
                    })}
                    {booking.services?.name && (
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {booking.services.name}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {booking.client_name}
                  </p>
                  {booking.client_phone && (
                    <a
                      href={`tel:${booking.client_phone}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    >
                      <Phone className="h-3 w-3" />
                      {booking.client_phone}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <BookingStatusBadge status={booking.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[14px] text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                      disabled={busy}
                      aria-label="Додаткові дії"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className={compact ? "z-[70]" : undefined}
                    >
                      <DropdownMenuItem
                        onClick={() => openCustomerProfile(booking)}
                      >
                        <User className="h-4 w-4" />
                        Про клієнта
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 dark:text-red-400"
                        onClick={() => deleteBooking(booking.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {booking.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-10"
                    disabled={busy}
                    onClick={() => updateStatus(booking.id, "confirmed")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Підтвердити
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10"
                    disabled={busy}
                    onClick={() => updateStatus(booking.id, "cancelled")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Скасувати
                  </Button>
                </div>
              )}

              {booking.status === "confirmed" && (
                <div className="mt-3 space-y-2">
                  <Button
                    size="sm"
                    className="w-full h-10"
                    disabled={busy}
                    onClick={() => updateStatus(booking.id, "completed")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Виконано
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      disabled={busy}
                      onClick={() => updateStatus(booking.id, "no_show")}
                    >
                      <UserX className="h-3.5 w-3.5 shrink-0" />
                      Не з&apos;явився
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      disabled={busy}
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Скасувати
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </ul>
    </div>
  );
}
