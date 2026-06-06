/** Нормалізує український номер до формату +380XXXXXXXXX. */
export function normalizeUaPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("380") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+380${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+38${digits}`;
  }
  if (trimmed.startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}

/** Форматує введення телефону з автоматичним префіксом +380. */
export function formatPhoneInput(value: string): string {
  if (!value) return "";

  if (value.startsWith("+")) {
    const digits = value.replace(/\D/g, "");
    return digits ? `+${digits.slice(0, 12)}` : "+";
  }

  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("380")) {
    return `+${digits.slice(0, 12)}`;
  }

  return `+380${digits.slice(0, 9)}`;
}
