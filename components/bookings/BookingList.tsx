"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatTime } from "@/lib/dates";
import type { BookingStatus, BookingWithService } from "@/types";
import { Check, Phone, UserX, X } from "lucide-react";

type BookingListProps = {
  bookings: BookingWithService[];
  timeZone: string;
  onBookingUpdated: (booking: BookingWithService) => void;
  compact?: boolean;
};

export function BookingList({
  bookings,
  timeZone,
  onBookingUpdated,
  compact = false,
}: BookingListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      setUpdatingId(id);
      try {
        const data = await apiFetch<{ booking: BookingWithService }>(
          `/api/bookings/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );
        onBookingUpdated(data.booking);
      } finally {
        setUpdatingId(null);
      }
    },
    [onBookingUpdated],
  );

  if (bookings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Записів не знайдено
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => {
        const busy = updatingId === booking.id;
        return (
          <Card key={booking.id} className={compact ? "p-3" : undefined}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatTime(booking.booking_start, timeZone)}
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
              <div className="mt-3 flex gap-2">
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
            )}
          </Card>
        );
      })}
    </ul>
  );
}
