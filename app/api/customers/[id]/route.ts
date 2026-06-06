import { NextResponse } from "next/server";
import { getCustomerBookings } from "@/lib/customers-server";
import {
  requireMaster,
  serverError,
} from "@/lib/api/response";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Customer } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const { id } = await context.params;

    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("master_id", authResult.master.id)
      .maybeSingle();

    if (error) throw error;
    if (!customer) {
      return NextResponse.json(
        { error: "Клієнта не знайдено" },
        { status: 404 },
      );
    }

    const bookings = await getCustomerBookings(
      authResult.master.id,
      customer as Customer,
    );

    return NextResponse.json({
      customer,
      bookings,
    });
  } catch (error) {
    console.error("[api/customers/[id] GET]", error);
    return serverError("Не вдалося завантажити клієнта");
  }
}
