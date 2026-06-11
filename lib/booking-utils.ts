export {
  getAvailableSlots,
  type GetAvailableSlotsOptions,
} from "@/lib/supabaseClient";

export function isStartTimeInAvailableSlots(
  slots: { start: string }[],
  startTime: string,
): boolean {
  const target = new Date(startTime).getTime();
  if (Number.isNaN(target)) return false;
  return slots.some((slot) => new Date(slot.start).getTime() === target);
}
