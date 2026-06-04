import { NextResponse } from "next/server";
import { isSlugTaken } from "@/lib/api/masters";
import { badRequest, requireMaster, serverError } from "@/lib/api/response";
import { isValidSlug, normalizeSlug, slugValidationMessage } from "@/lib/slug";

export async function GET(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("slug");

    if (!raw?.trim()) {
      return badRequest("slug обов'язковий");
    }

    const slug = normalizeSlug(raw);
    const validationError = slugValidationMessage(slug);
    if (validationError || !isValidSlug(slug)) {
      return NextResponse.json({
        available: false,
        message: validationError ?? "Невірний формат",
      });
    }

    const taken = await isSlugTaken(slug, authResult.master.id);

    return NextResponse.json({
      available: !taken,
      message: taken ? "Це посилання вже зайняте" : null,
    });
  } catch (error) {
    console.error("[api/masters/slug/check GET]", error);
    return serverError("Не вдалося перевірити slug");
  }
}
