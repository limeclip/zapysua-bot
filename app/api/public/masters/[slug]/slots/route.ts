import { NextResponse } from "next/server";
import { getPublicMasterProfile } from "@/lib/api/public-masters";
import { badRequest, serverError, subscriptionRequired } from "@/lib/api/response";
import { isMasterSubscriptionActive } from "@/lib/subscription-server";
import { getAvailableSlots } from "@/lib/supabaseClient";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const serviceId = searchParams.get("service_id");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest("Невірна дата");
    }
    if (!serviceId) {
      return badRequest("Оберіть послугу");
    }

    const profile = await getPublicMasterProfile(slug.trim());
    if (!profile) {
      return NextResponse.json(
        { error: "Майстра не знайдено" },
        { status: 404 },
      );
    }

    const service = profile.services.find((s) => s.id === serviceId);
    if (!service) {
      return badRequest("Послугу не знайдено");
    }

    const subscriptionActive = await isMasterSubscriptionActive(profile.id);
    if (!subscriptionActive) {
      return subscriptionRequired();
    }

    const slots = await getAvailableSlots(profile.id, date, undefined, {
      serviceId: service.id,
      duration: service.duration_minutes,
      workingHours: profile.working_hours,
      timeZone: profile.timezone,
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("[api/public/masters/[slug]/slots GET]", error);
    return serverError("Не вдалося завантажити вільні слоти");
  }
}
