const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,30}[a-z0-9])?$/;
const RESERVED_PREFIXES = ["ref_"];

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 32) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if (slug.includes("..")) return false;
  return !RESERVED_PREFIXES.some((prefix) => slug.startsWith(prefix));
}

export function slugValidationMessage(slug: string): string | null {
  if (!slug) return null;
  if (slug.length < 2) return "Мінімум 2 символи";
  if (slug.length > 32) return "Максимум 32 символи";
  if (!SLUG_PATTERN.test(slug)) {
    return "Латинські літери, цифри, крапка або дефіс";
  }
  if (slug.startsWith("ref_")) return "Префікс ref_ зарезервовано";
  return null;
}

export function generateDefaultSlug(telegramId: number): string {
  return `m${telegramId}`;
}
