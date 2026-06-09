import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMasterWithSubscription,
  serverError,
} from "@/lib/api/response";
import type { WorkingHours } from "@/types";

export async function PATCH(request: Request) {
  try {
    const authResult = await requireMasterWithSubscription(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const working_hours = body.working_hours as WorkingHours;

    if (!working_hours || typeof working_hours !== "object") {
      return badRequest("working_hours обов'язковий");
    }

    const { data, error } = await supabaseAdmin
      .from("masters")
      .update({ working_hours })
      .eq("id", authResult.master.id)
      .select("working_hours")
      .single();

    if (error) throw error;

    return NextResponse.json({ working_hours: data.working_hours });
  } catch (error) {
    console.error("[api/masters/working-hours]", error);
    return serverError("Не вдалося оновити робочі години");
  }
}
