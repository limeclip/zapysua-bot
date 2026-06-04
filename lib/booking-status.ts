import type { BookingStatus } from "@/types";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  cancelled: "Скасовано",
  completed: "Завершено",
  no_show: "Не з'явився",
};

export const BOOKING_STATUS_FILTER_LABELS: Record<
  BookingStatus | "all",
  string
> = {
  all: "Всі",
  pending: "Очікують",
  confirmed: "Підтверджені",
  cancelled: "Скасовані",
  completed: "Завершені",
  no_show: "Не з'явилися",
};
