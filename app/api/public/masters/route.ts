import { NextResponse } from "next/server";
import { getPublicMasterProfile } from "@/lib/api/public-masters";
import { badRequest, serverError } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim();

    if (!slug) {
      return badRequest("slug обов'язковий");
    }

    const profile = await getPublicMasterProfile(slug);

    if (!profile) {
      return NextResponse.json(
        { error: "Майстра не знайдено" },
        { status: 404 },
      );
    }

    return NextResponse.json({ master: profile });
  } catch (error) {
    console.error("[api/public/masters GET]", error);
    return serverError("Не вдалося завантажити профіль");
  }
}
