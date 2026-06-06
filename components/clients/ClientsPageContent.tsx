"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { formatDateLong, formatDateKey } from "@/lib/dates";
import type { CustomerWithStats, MasterWithMeta } from "@/types";
import { Calendar, ChevronRight, Phone, Search, User } from "lucide-react";

type ClientsPageContentProps = {
  master: MasterWithMeta;
};

type ClientsResponse = {
  customers: CustomerWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export function ClientsPageContent({ master }: ClientsPageContentProps) {
  const timeZone = master.timezone || "Europe/Kyiv";
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const data = await apiFetch<ClientsResponse>(
        `/api/customers?${params.toString()}`,
      );
      setCustomers(data.customers);
      setTotalPages(data.pagination.total_pages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук за ім'ям або телефоном"
          className="pl-9"
        />
      </div>

      {error && <ApiErrorState message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-zinc-500">
            <User className="h-8 w-8 text-zinc-300" />
            {debouncedSearch
              ? "Клієнтів за цим запитом не знайдено"
              : "Клієнтів поки немає"}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link href={`/clients/${customer.id}`}>
                <Card className="flex items-center gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  {customer.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={customer.avatar_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <User className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {customer.name}
                    </p>
                    {customer.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      {customer.bookings_count}{" "}
                      {customer.bookings_count === 1
                        ? "запис"
                        : customer.bookings_count >= 2 &&
                            customer.bookings_count <= 4
                          ? "записи"
                          : "записів"}
                      {customer.last_visit && (
                        <>
                          {" · "}
                          <Calendar className="mr-0.5 inline h-3 w-3" />
                          {formatDateLong(
                            formatDateKey(
                              new Date(customer.last_visit),
                              timeZone,
                            ),
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-sm text-zinc-500 disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-xs text-zinc-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm text-zinc-500 disabled:opacity-40"
          >
            Далі
          </button>
        </div>
      )}
    </div>
  );
}
