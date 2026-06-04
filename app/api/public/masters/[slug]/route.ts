import { NextResponse } from "next/server";
import { getPublicMasterProfile } from "@/lib/api/public-masters";
import { serverError } from "@/lib/api/response";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const profile = await getPublicMasterProfile(slug.trim());

    if (!profile) {
      return NextResponse.json(
        { error: "Майстра не знайдено" },
        { status: 404 },
      );
    }

    return NextResponse.json({ master: profile });
  } catch (error) {
    console.error("[api/public/masters/[slug] GET]", error);
    return serverError("Не вдалося завантажити профіль");
  }
}
