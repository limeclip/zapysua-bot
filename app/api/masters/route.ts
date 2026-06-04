import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMaster,
  serverError,
} from "@/lib/api/response";

export async function PATCH(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const businessName = body.business_name?.trim();

    if (!businessName || businessName.length < 2) {
      return badRequest("Назва бізнесу занадто коротка");
    }
    if (businessName.length > 120) {
      return badRequest("Назва бізнесу занадто довга");
    }

    const { data, error } = await supabaseAdmin
      .from("masters")
      .update({ business_name: businessName })
      .eq("id", authResult.master.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ master: data });
  } catch (error) {
    console.error("[api/masters PATCH]", error);
    return serverError("Не вдалося оновити назву бізнесу");
  }
}
