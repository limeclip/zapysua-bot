"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-status";
import { formatBookingDateTime } from "@/lib/dates";
import type {
  BookingStatus,
  BookingWithService,
  Customer,
  MasterWithMeta,
} from "@/types";
import {
  Calendar,
  Check,
  CheckCircle2,
  MoreVertical,
  Phone,
  Send,
  User,
  UserX,
  X,
} from "lucide-react";

type ClientDetailContentProps = {
  master: MasterWithMeta;
  customerId: string;
};

type CustomerDetailResponse = {
  customer: Customer;
  bookings: BookingWithService[];
};

const ITEMS_PER_PAGE = 10;

function hasBookingActions(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed";
}

export function ClientDetailContent({
  master,
  customerId,
}: ClientDetailContentProps) {
  const timeZone = master.timezone || "Europe/Kyiv";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CustomerDetailResponse>(
        `/api/customers/${customerId}`,
      );
      setCustomer(data.customer);
      setBookings(data.bookings);
      setError(null);
      setCurrentPage(1); // скидаємо на першу сторінку після завантаження
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const updateStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      setUpdatingId(id);
      setActionError(null);
      try {
        const data = await apiFetch<{ booking: BookingWithService }>(
          `/api/bookings/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? data.booking : b)),
        );
        setSuccessMessage(
          `Статус змінено: ${BOOKING_STATUS_LABELS[status]}`,
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Помилка оновлення",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  // Пагінація
  const totalPages = Math.ceil(bookings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentBookings = bookings.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
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
          {/* Telegram ID або username (за бажанням) */}
        </div>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Записи ({bookings.length})
        </h3>

        {successMessage && (
          <p className="rounded-[14px] bg-zinc-100 px-4 py-2.5 text-center text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {successMessage}
          </p>
        )}
        {actionError && (
          <p className="rounded-[14px] bg-red-50 px-4 py-2.5 text-center text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {actionError}
          </p>
        )}

        {bookings.length === 0 ? (
          <Card>
            <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-zinc-500">
              <Calendar className="h-6 w-6 text-zinc-300" />
              Записів ще немає
            </p>
          </Card>
        ) : (
          <>
            <ul className="space-y-3">
              {currentBookings.map((booking) => {
                const busy = updatingId === booking.id;
                const showMenu = hasBookingActions(booking.status);

                return (
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
                      <div className="flex shrink-0 items-center gap-1">
                        <BookingStatusBadge status={booking.status} />
                        {showMenu && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[14px] text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                              disabled={busy}
                              aria-label="Дії з записом"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {booking.status === "pending" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(booking.id, "confirmed")
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                    Підтвердити
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(booking.id, "cancelled")
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                    Скасувати
                                  </DropdownMenuItem>
                                </>
                              )}
                              {booking.status === "confirmed" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(booking.id, "completed")
                                    }
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Позначити як виконано
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(booking.id, "no_show")
                                    }
                                  >
                                    <UserX className="h-4 w-4" />
                                    Не з&apos;явився
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(booking.id, "cancelled")
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                    Скасувати
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
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
      </section>
    </div>
  );
}