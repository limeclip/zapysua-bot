"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { ClientBookingCard } from "@/components/client/ClientBookingCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import type { ClientBooking } from "@/types";
import { Calendar } from "lucide-react";

type ClientBookingsListProps = {
  masterId?: string;
  showMaster?: boolean;
};

export function ClientBookingsList({
  masterId,
  showMaster = true,
}: ClientBookingsListProps) {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = masterId
        ? `?master_id=${encodeURIComponent(masterId)}`
        : "";
      const data = await apiFetch<{ bookings: ClientBooking[] }>(
        `/api/customers/me/bookings${params}`,
      );
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleCancel = async (id: string) => {
    if (!confirm("Скасувати цей запис?")) return;

    setCancellingId(id);
    setError(null);
    try {
      await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      setSuccessMessage("Запис скасовано");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося скасувати");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {successMessage && (
        <p className="rounded-[14px] bg-zinc-100 px-4 py-2.5 text-center text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {successMessage}
        </p>
      )}
      {error && <ApiErrorState message={error} onRetry={load} />}

      {bookings.length === 0 ? (
        <Card>
          <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-zinc-500">
            <Calendar className="h-8 w-8 text-zinc-300" />
            Записів поки немає
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <ClientBookingCard
                booking={booking}
                showMaster={showMaster}
                cancelling={cancellingId === booking.id}
                onCancel={handleCancel}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
