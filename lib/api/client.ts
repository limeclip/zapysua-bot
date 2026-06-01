"use client";

export function getInitData(): string {
  if (typeof window === "undefined") return "";

  const tg = window.Telegram?.WebApp;
  if (tg?.initData) return tg.initData;

  if (process.env.NODE_ENV === "development") {
    const devId = process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID;
    if (devId) return "";
  }

  return "";
}

export function getApiHeaders(): HeadersInit {
  const initData = getInitData();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (initData) {
    headers["x-telegram-init-data"] = initData;
  } else if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID
  ) {
    headers["x-telegram-user-id"] = process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID;
  }

  return headers;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const headers = getApiHeaders();

  const response = await fetch(path, {
    ...options,
    headers: isFormData
      ? { ...headers, ...(options?.headers as Record<string, string>) }
      : { ...headers, ...(options?.headers as Record<string, string>) },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Помилка запиту");
  }

  return data as T;
}
