import type { SocialLinks } from "@/types";

export function normalizeSocialUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseSocialLinksInput(
  input: Record<string, string>,
): SocialLinks {
  const result: SocialLinks = {};
  for (const key of ["instagram", "tiktok", "facebook", "telegram"] as const) {
    const raw = input[key]?.trim();
    if (raw) result[key] = normalizeSocialUrl(raw);
  }
  return result;
}

export function socialLinksToForm(
  links: SocialLinks | null | undefined,
): Record<keyof SocialLinks, string> {
  return {
    instagram: links?.instagram ?? "",
    tiktok: links?.tiktok ?? "",
    facebook: links?.facebook ?? "",
    telegram: links?.telegram ?? "",
  };
}
