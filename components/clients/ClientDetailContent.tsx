"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatBookingDateTime } from "@/lib/dates";
import type { BookingWithService, Customer, MasterWithMeta } from "@/types";
import { Calendar, Phone, Send, User } from "lucide-react";

type ClientDetailContentProps = {
  master: MasterWithMeta;
  customerId: string;
};

type CustomerDetailResponse = {
  customer: Customer;
  bookings: BookingWithService[];
};

export function ClientDetailContent({
  master,
  customerId,
}: ClientDetailContentProps) {
  const timeZone = master.timezone || "Europe/Kyiv";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CustomerDetailResponse>(
        `/api/customers/${customerId}`,
      );
      setCustomer(data.customer);
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <ApiErrorState
        message={error ?? "Клієнта не знайдено"}
        onRetry={load}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <Card className="flex items-start gap-4">
        {customer.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <User className="h-7 w-7 text-zinc-400" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {customer.name}
          </h2>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Phone className="h-4 w-4" />
              {customer.phone}
            </a>
          )}
          {customer.telegram_id && (
            <p className="flex items-center gap-2 text-xs text-zinc-500">
              <Send className="h-3.5 w-3.5" />
              Telegram ID: {customer.telegram_id}
            </p>
          )}
        </div>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Записи ({bookings.length})
        </h3>
        {bookings.length === 0 ? (
          <Card>
            <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-zinc-500">
              <Calendar className="h-6 w-6 text-zinc-300" />
              Записів ще немає
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatBookingDateTime(booking.booking_start, timeZone)}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {booking.services?.name ?? "Послуга"}
                    </p>
                    {booking.services?.price != null && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {booking.services.price} грн
                      </p>
                    )}
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
