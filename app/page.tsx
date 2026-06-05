"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniAppShell } from "@/components/MiniAppShell";
import { LoaderCircle } from "lucide-react";

function resolveStartParam(searchParams: URLSearchParams): string | null {
  const fromStartapp = searchParams.get("startapp")?.trim();
  if (fromStartapp) return fromStartapp;

  // Telegram інколи додає параметр у URL під іншим ім'ям
  const fromTgParam = searchParams.get("tgWebAppStartParam")?.trim();
  if (fromTgParam) return fromTgParam;

  return null;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStartParam = resolveStartParam(searchParams);

  const [resolved, setResolved] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const attemptRedirect = (): boolean => {
      const tg = window.Telegram?.WebApp;
      tg?.ready();
      tg?.expand();

      const tgStartParam = tg?.initDataUnsafe?.start_param?.trim() || null;
      const finalStartParam = urlStartParam || tgStartParam;

      console.log("[Home] startapp from URL:", urlStartParam);
      console.log("[Home] start_param from Telegram:", tgStartParam);
      console.log("[Home] final start param:", finalStartParam);

      if (finalStartParam) {
        const target = `/client/${encodeURIComponent(finalStartParam)}`;
        console.log("[Home] redirecting to:", target);
        setIsRedirecting(true);
        router.replace(target);
        return true;
      }

      return false;
    };

    if (attemptRedirect()) {
      setResolved(true);
      return;
    }

    // SDK може бути ще не готовий при першому рендері
    const timer = setTimeout(() => {
      if (cancelled) return;
      attemptRedirect();
      setResolved(true);
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router, urlStartParam]);

  if (!resolved || isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500">Завантаження…</p>
      </div>
    );
  }

  return <MiniAppShell />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
