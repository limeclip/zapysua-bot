import { supabaseAdmin } from "@/lib/supabase/server";

export async function findOverlappingBooking(
  masterId: string,
  bookingStart: Date,
  durationMinutes: number,
  excludeBookingId?: string,
): Promise<boolean> {
  const bookingEnd = new Date(
    bookingStart.getTime() + durationMinutes * 60 * 1000,
  );

  let query = supabaseAdmin
    .from("bookings")
    .select("id, booking_start, duration_minutes")
    .eq("master_id", masterId)
    .in("status", ["pending", "confirmed"]);

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;
  if (error) throw error;

  for (const existing of data ?? []) {
    const existingStart = new Date(existing.booking_start);
    const existingEnd = new Date(
      existingStart.getTime() + existing.duration_minutes * 60 * 1000,
    );
    if (bookingStart < existingEnd && bookingEnd > existingStart) {
      return true;
    }
  }

  return false;
}

export async function upsertCustomerByPhone(params: {
  masterId: string;
  name: string;
  phone: string | null;
}): Promise<string | null> {
  if (!params.phone) return null;

  const normalizedPhone = params.phone.replace(/\s+/g, "");

  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("master_id", params.masterId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("customers")
      .update({ name: params.name })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabaseAdmin
    .from("customers")
    .insert({
      master_id: params.masterId,
      name: params.name,
      phone: normalizedPhone,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created?.id ?? null;
}
