import { NextResponse } from "next/server";
import { getPublicMasterProfile } from "@/lib/api/public-masters";
import { badRequest, serverError } from "@/lib/api/response";
import { formatDateKey } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return badRequest("Потрібні параметри start_date та end_date");
    }

    const profile = await getPublicMasterProfile(slug.trim());
    if (!profile) {
      return NextResponse.json(
        { error: "Майстра не знайдено" },
        { status: 404 },
      );
    }

    const timeZone = profile.timezone ?? "Europe/Kyiv";

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("booking_start")
      .eq("master_id", profile.id)
      .in("status", ["pending", "confirmed", "completed"])
      .gte("booking_start", startDate)
      .lte("booking_start", endDate);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const booking of data ?? []) {
      const key = formatDateKey(new Date(booking.booking_start), timeZone);
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("[api/public/masters/[slug]/bookings GET]", error);
    return serverError("Не вдалося завантажити записи");
  }
}
