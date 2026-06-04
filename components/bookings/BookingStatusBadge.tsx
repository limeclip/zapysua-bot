import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  cancelled: "Скасовано",
  completed: "Завершено",
  no_show: "Не з'явився",
};

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
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  );
}
