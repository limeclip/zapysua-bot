import type { MasterCategory } from "@/types";

export const MASTER_CATEGORY_OPTIONS: {
  value: MasterCategory;
  label: string;
}[] = [
  { value: "beauty", label: "Краса та б'юті" },
  { value: "health", label: "Здоров'я" },
  { value: "education", label: "Освіта" },
  { value: "auto", label: "Авто" },
  { value: "other", label: "Інше" },
];

export function getCategoryLabel(category: string): string {
  return (
    MASTER_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category
  );
}
