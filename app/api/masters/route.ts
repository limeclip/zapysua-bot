import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isSlugTaken } from "@/lib/api/masters";
import {
  badRequest,
  requireMaster,
  serverError,
} from "@/lib/api/response";
import { isValidSlug, normalizeSlug, slugValidationMessage } from "@/lib/slug";

export async function PATCH(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.business_name !== undefined) {
      const businessName = String(body.business_name).trim();
      if (businessName.length < 2) {
        return badRequest("Назва бізнесу занадто коротка");
      }
      if (businessName.length > 120) {
        return badRequest("Назва бізнесу занадто довга");
      }
      updates.business_name = businessName;
    }

    if (body.slug !== undefined) {
      if (body.slug === null || String(body.slug).trim() === "") {
        updates.slug = null;
      } else {
        const slug = normalizeSlug(String(body.slug));
        const validationError = slugValidationMessage(slug);
        if (validationError || !isValidSlug(slug)) {
          return badRequest(
            validationError ?? "Невірний формат slug",
          );
        }

        const taken = await isSlugTaken(slug, authResult.master.id);
        if (taken) {
          return badRequest("Це посилання вже зайняте");
        }

        updates.slug = slug;
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("Немає полів для оновлення");
    }

    const { data, error } = await supabaseAdmin
      .from("masters")
      .update(updates)
      .eq("id", authResult.master.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return badRequest("Це посилання вже зайняте");
      }
      throw error;
    }

    return NextResponse.json({ master: data });
  } catch (error) {
    console.error("[api/masters PATCH]", error);
    return serverError("Не вдалося оновити профіль");
  }
}
