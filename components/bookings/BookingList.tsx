"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatBookingDateTime } from "@/lib/dates";
import type { BookingStatus, BookingWithService } from "@/types";
import {
  Check,
  CheckCircle2,
  Phone,
  Trash2,
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
        if (status === "completed") {
          setSuccessMessage("Запис позначено як виконано");
        }
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
        setConfirmDeleteId(null);
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
          const busy = updatingId === booking.id || deletingId === booking.id;
          const confirming = confirmDeleteId === booking.id;

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
                <BookingStatusBadge status={booking.status} />
              </div>

              {booking.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => updateStatus(booking.id, "confirmed")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Підтвердити
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
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
                    className="w-full"
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
                      className="flex-1 text-xs"
                      disabled={busy}
                      onClick={() => updateStatus(booking.id, "no_show")}
                    >
                      <UserX className="h-3.5 w-3.5 shrink-0" />
                      Не з&apos;явився
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Скасувати
                    </Button>
                  </div>
                </div>
              )}

              {confirming ? (
                <div className="mt-3 space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Ви впевнені, що хочете видалити запис?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Ні
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => deleteBooking(booking.id)}
                    >
                      Так, видалити
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full text-zinc-500"
                  disabled={busy}
                  onClick={() => setConfirmDeleteId(booking.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Видалити
                </Button>
              )}
            </Card>
          );
        })}
      </ul>
    </div>
  );
}
