import { NextResponse } from "next/server";
import {
  badRequest,
  requireMasterWithSubscription,
  serverError,
} from "@/lib/api/response";
import { parseWorkingHours } from "@/lib/working-hours";
import { getAvailableSlots } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const serviceId = searchParams.get("service_id");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest("Невірна дата");
    }
    if (!serviceId) {
      return badRequest("Оберіть послугу");
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("master_id", authResult.master.id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service || !service.is_active) {
      return badRequest("Послугу не знайдено");
    }

    const slots = await getAvailableSlots(
      authResult.master.id,
      date,
      undefined,
      {
        serviceId: service.id,
        duration: service.duration_minutes,
        workingHours: parseWorkingHours(authResult.master.working_hours),
        timeZone: authResult.master.timezone,
      },
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("[api/slots GET]", error);
    return serverError("Не вдалося завантажити вільні слоти");
  }
}
