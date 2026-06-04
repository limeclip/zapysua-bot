import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMasterWithSubscription,
  serverError,
} from "@/lib/api/response";
import {
  endOfMonth,
  endOfWeek,
  formatDateKey,
  startOfMonth,
  startOfWeek,
  toIsoRangeEnd,
  toIsoRangeStart,
} from "@/lib/dates";
import type { BookingStatistics, BookingWithService } from "@/types";

function computeStats(
  bookings: BookingWithService[],
  period: "week" | "month",
  rangeStart: Date,
  rangeEnd: Date,
): BookingStatistics {
  const total = bookings.length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const noShow = bookings.filter((b) => b.status === "no_show").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;

  const percent = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  const completedWithPrice = bookings.filter(
    (b) => b.status === "completed" && b.services?.price != null,
  );
  const hasPrices = completedWithPrice.length > 0;
  const revenue = hasPrices
    ? completedWithPrice.reduce((sum, b) => sum + (b.services?.price ?? 0), 0)
    : null;

  const daysInRange =
    Math.max(
      1,
      Math.ceil(
        (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1,
    );

  return {
    period,
    total_bookings: total,
    confirmed_count: confirmed,
    cancelled_count: cancelled,
    no_show_count: noShow,
    completed_count: completed,
    pending_count: pending,
    confirmed_percent: percent(confirmed),
    cancelled_percent: percent(cancelled),
    no_show_percent: percent(noShow),
    revenue,
    avg_per_day: Math.round((total / daysInRange) * 10) / 10,
  };
}

export async function GET(request: Request) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "week";

    if (period !== "week" && period !== "month") {
      return badRequest("period має бути week або month");
    }

    const timeZone = authResult.master.timezone || "Europe/Kyiv";
    const now = new Date();

    const rangeStart =
      period === "week" ? startOfWeek(now, timeZone) : startOfMonth(now, timeZone);
    const rangeEnd =
      period === "week" ? endOfWeek(now, timeZone) : endOfMonth(now, timeZone);

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*, services(id, name, price)")
      .eq("master_id", authResult.master.id)
      .gte("booking_start", toIsoRangeStart(rangeStart, timeZone))
      .lte("booking_start", toIsoRangeEnd(rangeEnd, timeZone));

    if (error) throw error;

    const stats = computeStats(
      (data ?? []) as BookingWithService[],
      period,
      rangeStart,
      rangeEnd,
    );

    return NextResponse.json({
      statistics: stats,
      range: {
        start: formatDateKey(rangeStart, timeZone),
        end: formatDateKey(rangeEnd, timeZone),
      },
    });
  } catch (error) {
    console.error("[api/statistics GET]", error);
    return serverError("Не вдалося завантажити статистику");
  }
}
