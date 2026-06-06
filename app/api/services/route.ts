import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  badRequest,
  requireMaster,
  serverError,
} from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const { data, error } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("master_id", authResult.master.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ services: data ?? [] });
  } catch (error) {
    console.error("[api/services GET]", error);
    return serverError("Не вдалося завантажити послуги");
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const name = body.name?.trim();
    const price = parseInt(String(body.price), 10);
    const duration = parseInt(String(body.duration_minutes), 10);

    if (!name || name.length < 2) {
      return badRequest("Назва послуги занадто коротка");
    }
    if (Number.isNaN(price) || price < 0) {
      return badRequest("Невірна ціна");
    }
    if (Number.isNaN(duration) || duration <= 0) {
      return badRequest("Невірна тривалість");
    }

    const imageUrl =
      body.image_url === undefined || body.image_url === null
        ? null
        : String(body.image_url).trim() || null;

    const { data, error } = await supabaseAdmin
      .from("services")
      .insert({
        master_id: authResult.master.id,
        name,
        price,
        duration_minutes: duration,
        description: body.description?.trim() || null,
        image_url: imageUrl,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ service: data });
  } catch (error) {
    console.error("[api/services POST]", error);
    return serverError("Не вдалося створити послугу");
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const serviceId = body.id as string;

    if (!serviceId) return badRequest("id обов'язковий");

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.price !== undefined) updates.price = parseInt(String(body.price), 10);
    if (body.duration_minutes !== undefined) {
      updates.duration_minutes = parseInt(String(body.duration_minutes), 10);
    }
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }
    if (body.image_url !== undefined) {
      updates.image_url =
        body.image_url === null ? null : String(body.image_url).trim() || null;
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .update(updates)
      .eq("id", serviceId)
      .eq("master_id", authResult.master.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ service: data });
  } catch (error) {
    console.error("[api/services PATCH]", error);
    return serverError("Не вдалося оновити послугу");
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireMaster(request);
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return badRequest("id обов'язковий");

    const { error } = await supabaseAdmin
      .from("services")
      .update({ is_active: false })
      .eq("id", id)
      .eq("master_id", authResult.master.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/services DELETE]", error);
    return serverError("Не вдалося видалити послугу");
  }
}
