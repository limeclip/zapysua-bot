import type { Customer } from "@/types";

export function mergeCustomerProfiles(
  customers: Customer[],
  telegramId: number,
): {
  name: string;
  phone: string | null;
  avatar_url: string | null;
  has_profile: boolean;
} {
  if (customers.length === 0) {
    return {
      name: "",
      phone: null,
      avatar_url: null,
      has_profile: false,
    };
  }

  const sorted = [...customers].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
  const latest = sorted[0];

  const avatar =
    sorted.find((c) => c.avatar_url)?.avatar_url ?? latest.avatar_url ?? null;

  return {
    name: latest.name,
    phone: latest.phone ?? null,
    avatar_url: avatar,
    has_profile: true,
  };
}
