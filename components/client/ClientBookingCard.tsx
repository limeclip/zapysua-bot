"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatBookingDateTime } from "@/lib/dates";
import type { ClientBooking } from "@/types";
import { LoaderCircle, Repeat, XCircle } from "lucide-react";

type ClientBookingCardProps = {
  booking: ClientBooking;
  showMaster?: boolean;
  cancelling?: boolean;
  onCancel?: (id: string) => void;
};

export function ClientBookingCard({
  booking,
  showMaster = true,
  cancelling = false,
  onCancel,
}: ClientBookingCardProps) {
  const canCancel =
    onCancel &&
    (booking.status === "pending" || booking.status === "confirmed");

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showMaster && (
            <p className="text-xs font-medium text-zinc-500">
              {booking.business_name}
            </p>
          )}
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatBookingDateTime(
              booking.booking_start,
              booking.master_timezone,
            )}
          </p>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {booking.service_name ?? "Послуга"}
          </p>
          {booking.service_price != null && (
            <p className="mt-1 text-xs text-zinc-500">
              {booking.service_price} грн
            </p>
          )}
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {canCancel && (
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={cancelling}
            onClick={() => onCancel(booking.id)}
          >
            {cancelling ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Скасувати
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => alert("Буде доступно найближчим часом")}
          >
            <Repeat className="h-3.5 w-3.5" />
            Перенести
          </Button>
        </div>
      )}
    </Card>
  );
}
