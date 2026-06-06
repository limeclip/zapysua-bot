import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isSlugTaken } from "@/lib/api/masters";
import {
  badRequest,
  requireMaster,
  serverError,
} from "@/lib/api/response";
import { isValidSlug, normalizeSlug, slugValidationMessage } from "@/lib/slug";
import { parseSocialLinksInput } from "@/lib/social-links";
import type { MasterCategory, ServicesLayout, SocialLinks } from "@/types";

const VALID_CATEGORIES: MasterCategory[] = [
  "beauty",
  "health",
  "education",
  "auto",
  "other",
];

function parseSocialLinksBody(
  body: unknown,
): SocialLinks | { error: ReturnType<typeof badRequest> } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { error: badRequest("Невірний формат social_links") };
  }
  const raw = body as Record<string, unknown>;
  return parseSocialLinksInput({
    instagram: String(raw.instagram ?? ""),
    tiktok: String(raw.tiktok ?? ""),
    facebook: String(raw.facebook ?? ""),
    telegram: String(raw.telegram ?? ""),
  });
}

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

    if (body.description !== undefined) {
      const description =
        body.description === null ? null : String(body.description).trim();
      if (description && description.length > 2000) {
        return badRequest("Опис занадто довгий");
      }
      updates.description = description || null;
    }

    if (body.category !== undefined) {
      const category = body.category as MasterCategory;
      if (!VALID_CATEGORIES.includes(category)) {
        return badRequest("Невірна категорія");
      }
      updates.category = category;
    }

    if (body.location !== undefined) {
      updates.location =
        body.location === null ? null : String(body.location).trim() || null;
    }

    if (body.phone !== undefined) {
      updates.phone =
        body.phone === null ? null : String(body.phone).trim() || null;
    }

    if (body.social_links !== undefined) {
      const linksResult = parseSocialLinksBody(body.social_links);
      if ("error" in linksResult) return linksResult.error;
      updates.social_links = linksResult;
    }

    if (body.services_layout !== undefined) {
      const layout = body.services_layout as ServicesLayout;
      if (layout !== "list" && layout !== "grid") {
        return badRequest("Невірний макет послуг");
      }
      updates.services_layout = layout;
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
