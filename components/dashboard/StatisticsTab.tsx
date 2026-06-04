"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import type { BookingStatistics, MasterWithMeta } from "@/types";
import {
  Ban,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  TrendingUp,
  UserX,
} from "lucide-react";

type StatisticsTabProps = {
  master: MasterWithMeta;
};

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-400">{sub}</p>}
      </div>
    </Card>
  );
}

function RevenueBlock({
  monthStats,
  weekStats,
}: {
  monthStats: BookingStatistics | null;
  weekStats: BookingStatistics | null;
}) {
  const monthRevenue = monthStats?.revenue;
  const weekRevenue = weekStats?.revenue;

  if (monthRevenue === null && weekRevenue === null) return null;
  if (monthRevenue === undefined && weekRevenue === undefined) return null;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <CircleDollarSign className="h-5 w-5 text-zinc-600" />
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Виручка
        </p>
      </div>
      <p className="text-xs text-zinc-500">
        Лише завершені записи з ціною послуги
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-[10px] text-zinc-500">За місяць</p>
          <p className="text-lg font-semibold">
            {monthRevenue != null ? `${monthRevenue} грн` : "—"}
          </p>
          {monthStats && (
            <p className="text-[10px] text-zinc-400">
              {monthStats.completed_count} виконано
            </p>
          )}
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-[10px] text-zinc-500">За тиждень</p>
          <p className="text-lg font-semibold">
            {weekRevenue != null ? `${weekRevenue} грн` : "—"}
          </p>
          {weekStats && (
            <p className="text-[10px] text-zinc-400">
              {weekStats.completed_count} виконано
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function StatisticsTab({ master }: StatisticsTabProps) {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [weekStats, setWeekStats] = useState<BookingStatistics | null>(null);
  const [monthStats, setMonthStats] = useState<BookingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [weekRes, monthRes] = await Promise.all([
        apiFetch<{ statistics: BookingStatistics }>(
          "/api/statistics?period=week",
        ),
        apiFetch<{ statistics: BookingStatistics }>(
          "/api/statistics?period=month",
        ),
      ]);
      setWeekStats(weekRes.statistics);
      setMonthStats(monthRes.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = period === "week" ? weekStats : monthStats;
  const periodLabel = period === "week" ? "тиждень" : "місяць";

  return (
    <SubscriptionGate master={master}>
      <div className="space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Статистика
          </h2>
          <div className="flex rounded-xl border border-zinc-200 p-0.5 dark:border-zinc-700">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500"
                }`}
              >
                {p === "week" ? "Тиждень" : "Місяць"}
              </button>
            ))}
          </div>
        </div>

        {error && <ApiErrorState message={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            <RevenueBlock monthStats={monthStats} weekStats={weekStats} />

            {stats && (
              <div className="space-y-3">
                <StatCard
                  label={`Записів за ${periodLabel}`}
                  value={String(stats.total_bookings)}
                  sub={`~${stats.avg_per_day} на день`}
                  icon={<CalendarCheck className="h-5 w-5 text-zinc-600" />}
                />
                <StatCard
                  label="Виконано"
                  value={String(stats.completed_count)}
                  sub="Завершені записи"
                  icon={<CheckCircle2 className="h-5 w-5 text-zinc-600" />}
                />
                <StatCard
                  label="Підтверджені"
                  value={`${stats.confirmed_percent}%`}
                  sub={`${stats.confirmed_count} записів`}
                  icon={<TrendingUp className="h-5 w-5 text-zinc-600" />}
                />
                <StatCard
                  label="Скасовані"
                  value={`${stats.cancelled_percent}%`}
                  sub={`${stats.cancelled_count} записів`}
                  icon={<Ban className="h-5 w-5 text-zinc-600" />}
                />
                <StatCard
                  label="Не з'явилися"
                  value={`${stats.no_show_percent}%`}
                  sub={`${stats.no_show_count} записів`}
                  icon={<UserX className="h-5 w-5 text-zinc-600" />}
                />
              </div>
            )}
          </>
        )}
      </div>
    </SubscriptionGate>
  );
}
