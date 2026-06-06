import { NextResponse } from "next/server";
import { getPublicMasterProfile } from "@/lib/api/public-masters";
import {
  requireTelegramUser,
  serverError,
  unauthorized,
} from "@/lib/api/response";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) {
      return unauthorized();
    }

    const { slug } = await context.params;
    const profile = await getPublicMasterProfile(slug.trim());
    if (!profile) {
      return NextResponse.json(
        { error: "Майстра не знайдено" },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("id, name, phone")
      .eq("master_id", profile.id)
      .eq("telegram_id", authResult.user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ customer: data ?? null });
  } catch (error) {
    console.error("[api/public/masters/[slug]/customer GET]", error);
    return serverError("Не вдалося завантажити дані клієнта");
  }
}
