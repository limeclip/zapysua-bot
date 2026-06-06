import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  requireTelegramUser,
  serverError,
} from "@/lib/api/response";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  try {
    const authResult = await requireTelegramUser(request);
    if ("error" in authResult) return authResult.error;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не передано" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Дозволені формати: JPEG, PNG, WebP, GIF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Файл занадто великий (макс. 5 МБ)" },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${authResult.user.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[api/customers/me/avatar] upload:", uploadError);
      return NextResponse.json(
        { error: "Не вдалося завантажити аватар" },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(path);

    const avatar_url = publicUrlData.publicUrl;

    return NextResponse.json({ avatar_url });
  } catch (error) {
    console.error("[api/customers/me/avatar]", error);
    return serverError("Помилка завантаження аватара");
  }
}
