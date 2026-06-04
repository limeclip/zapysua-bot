import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-status";
import type { BookingStatus } from "@/types";

const STATUS_VARIANTS: Record<
  BookingStatus,
  "warning" | "success" | "danger" | "secondary" | "muted"
> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
  completed: "secondary",
  no_show: "muted",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
