"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniAppShell } from "@/components/MiniAppShell";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    async function init() {
      try {
        if (tg) {
          tg.ready();
          tg.expand();
        }

        console.log("========== TELEGRAM MINI APP ==========");
        console.log("FULL URL:", window.location.href);
        console.log("SEARCH:", window.location.search);
        console.log("INIT DATA:", tg?.initData);
        console.log("INIT DATA UNSAFE:", tg?.initDataUnsafe);

        let startParam = searchParams.get("startapp")?.trim() ||
                         searchParams.get("tgWebAppStartParam")?.trim() ||
                         null;
        const tgStartParam = tg?.initDataUnsafe?.start_param?.trim() || null;
        startParam = startParam || tgStartParam;

        console.log("[MiniApp] startapp from URL:", startParam);
        console.log("[MiniApp] start_param from Telegram:", tgStartParam);
        console.log("[MiniApp] final start param:", startParam);

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Обробка переходу в кабінет клієнта
        if (startParam === 'account') {
          console.log('[MiniApp] Redirecting to /client/account');
          startTransition(() => {
            setIsRedirecting(true);
            router.replace('/client/account');
          });
          return;
        }

        // ВИПРАВЛЕНО: обробка master
        if (startParam === 'master') {
          console.log('[MiniApp] Master detected, redirecting to /');
          startTransition(() => {
            setIsRedirecting(true);
            router.replace('/');
          });
          return;
        }

        if (startParam) {
          console.log(`[MiniApp] Redirecting to /client/${startParam}`);
          startTransition(() => {
            setIsRedirecting(true);
            router.replace(`/client/${startParam}`);
          });
          return;
        }

        console.log("[MiniApp] start_param NOT FOUND");
        // Якщо параметра немає – показуємо дашборд майстра
        setIsRedirecting(false);
      } catch (error) {
        console.error("[MiniApp] ERROR:", error);
      }
    }

    init();
  }, [router, searchParams, startTransition]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Завантаження...</p>
        </div>
      </div>
    );
  }

  return <MiniAppShell />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Завантаження...</div>}>
      <HomeContent />
    </Suspense>
  );
}