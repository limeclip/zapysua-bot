"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { ClientBookingCard } from "@/components/client/ClientBookingCard";
import { RescheduleBookingModal } from "@/components/client/RescheduleBookingModal";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { ClientBooking } from "@/types";
import { Calendar } from "lucide-react";

type ClientBookingsListProps = {
  masterId?: string;
  showMaster?: boolean;
};

const ITEMS_PER_PAGE = 10;

export function ClientBookingsList({
  masterId,
  showMaster = true,
}: ClientBookingsListProps) {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] =
    useState<ClientBooking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
      setCurrentPage(1); // скидаємо на першу сторінку після оновлення
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

  // Пагінація
  const totalPages = Math.ceil(bookings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentBookings = bookings.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Прокрутка до верху списку (опціонально)
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goToPage(1);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis-start" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={i === currentPage}
            onClick={(e) => {
              e.preventDefault();
              goToPage(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationEllipsis key="ellipsis-end" />);
      }
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goToPage(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }
    return items;
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
        <>
          <ul className="space-y-3">
            {currentBookings.map((booking) => (
              <li key={booking.id}>
                <ClientBookingCard
                  booking={booking}
                  showMaster={showMaster}
                  cancelling={cancellingId === booking.id}
                  onCancel={handleCancel}
                  onReschedule={setRescheduleBooking}
                />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(currentPage - 1);
                    }}
                    aria-disabled={currentPage === 1}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(currentPage + 1);
                    }}
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {rescheduleBooking && (
        <RescheduleBookingModal
          booking={rescheduleBooking}
          open
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={() => {
            setSuccessMessage("Запис перенесено");
            load();
          }}
        />
      )}
    </div>
  );
}