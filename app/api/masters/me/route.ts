import { NextResponse } from "next/server";
import {
  ensureMinimalMaster,
  getMasterWithMeta,
} from "@/lib/api/masters";
import {
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    let master = await getMasterWithMeta(authResult.user.id);

    if (!master) {
      await ensureMinimalMaster(
        authResult.user.id,
        authResult.user.username,
      );
      master = await getMasterWithMeta(authResult.user.id);
    }

    return NextResponse.json({ master });
  } catch (error) {
    console.error("[api/masters/me]", error);
    return serverError("Не вдалося завантажити профіль");
  }
}
