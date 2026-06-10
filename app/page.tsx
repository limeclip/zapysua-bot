"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Loader } from "@/components/Loader";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Синхронне читання startParam (без useEffect)
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  let startParam =
    searchParams.get("startapp")?.trim() ||
    searchParams.get("tgWebAppStartParam")?.trim() ||
    null;
  const tgStartParam = tg?.initDataUnsafe?.start_param?.trim() || null;
  startParam = startParam || tgStartParam;

  // Визначаємо, чи потрібен редирект
  const needRedirect =
    startParam === "account" || (startParam && startParam !== "master");
  const redirectTarget = needRedirect
    ? startParam === "account"
      ? "/client/account"
      : `/client/${startParam}`
    : null;

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Виконуємо редирект, якщо потрібно
  useEffect(() => {
    if (redirectTarget && !isRedirecting) {
      setIsRedirecting(true);
      startTransition(() => {
        router.replace(redirectTarget);
      });
    }
  }, [redirectTarget, router, startTransition, isRedirecting]);

  // Показуємо лоадер тільки під час редиректу
  if (redirectTarget) {
    return <Loader text="Завантаження..." />;
  }

  // Для майстра (startParam === 'master' або відсутній) одразу рендеримо MiniAppShell
  return <MiniAppShell />;
}

export default function Home() {
  return (
    <Suspense fallback={<Loader text="Завантаження..." />}>
      <HomeContent />
    </Suspense>
  );
}