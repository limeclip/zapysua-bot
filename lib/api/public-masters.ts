import { supabaseAdmin } from "@/lib/supabase/server";
import { parseWorkingHours } from "@/lib/working-hours";
import type { MasterCategory, PublicMasterProfile, Service } from "@/types";

export async function resolveMasterBySlugOrRef(
  slugOrRef: string,
): Promise<{ id: string } | null> {
  if (slugOrRef.startsWith("ref_")) {
    const id = slugOrRef.slice(4);
    const { data } = await supabaseAdmin
      .from("masters")
      .select("id")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    return data;
  }

  const { data } = await supabaseAdmin
    .from("masters")
    .select("id")
    .eq("slug", slugOrRef)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export async function getPublicMasterProfile(
  slugOrRef: string,
): Promise<PublicMasterProfile | null> {
  let query = supabaseAdmin
    .from("masters")
    .select(
      "id, business_name, logo_url, description, category, location, phone, social_links, timezone, working_hours",
    )
    .eq("is_active", true);

  if (slugOrRef.startsWith("ref_")) {
    query = query.eq("id", slugOrRef.slice(4));
  } else {
    query = query.eq("slug", slugOrRef);
  }

  const { data: master, error } = await query.maybeSingle();
  if (error) throw error;
  if (!master) return null;

  const { data: services, error: servicesError } = await supabaseAdmin
    .from("services")
    .select("id, name, price, duration_minutes, description")
    .eq("master_id", master.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (servicesError) throw servicesError;

  return {
    id: master.id,
    business_name: master.business_name,
    logo_url: master.logo_url,
    description: master.description,
    category: master.category as MasterCategory,
    location: master.location,
    phone: master.phone,
    social_links: (master.social_links as PublicMasterProfile["social_links"]) ?? null,
    timezone: master.timezone ?? "Europe/Kyiv",
    working_hours: parseWorkingHours(
      master.working_hours as Record<string, unknown> | null,
    ),
    services: (services ?? []) as Pick<
      Service,
      "id" | "name" | "price" | "duration_minutes" | "description"
    >[],
  };
}
