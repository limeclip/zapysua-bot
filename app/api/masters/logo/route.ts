import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  requireMaster,
  serverError,
} from "@/lib/api/response";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  try {
    const authResult = await requireMaster(request);
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
    const path = `${authResult.master.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("logos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[api/masters/logo] upload:", uploadError);
      return NextResponse.json(
        { error: "Не вдалося завантажити логотип" },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("logos")
      .getPublicUrl(path);

    const logo_url = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("masters")
      .update({ logo_url })
      .eq("id", authResult.master.id);

    if (updateError) throw updateError;

    return NextResponse.json({ logo_url });
  } catch (error) {
    console.error("[api/masters/logo]", error);
    return serverError("Помилка завантаження логотипу");
  }
}
