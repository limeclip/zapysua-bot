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
        // Telegram Mini App init
        if (tg) {
          tg.ready();
          tg.expand();
        }

        console.log("========== TELEGRAM MINI APP ==========");
        console.log("FULL URL:", window.location.href);
        console.log("SEARCH:", window.location.search);
        console.log("INIT DATA:", tg?.initData);
        console.log("INIT DATA UNSAFE:", tg?.initDataUnsafe);

        let startParam: string | null = null;

        /**
         * 1. Основной способ Telegram
         */
        if (tg?.initDataUnsafe?.start_param) {
          startParam = tg.initDataUnsafe.start_param;
        }

        /**
         * 2. Fallback через URL params
         */
        if (!startParam) {
          startParam =
            searchParams.get("tgWebAppStartParam") ||
            searchParams.get("startapp");
        }

        console.log("FINAL START PARAM:", startParam);

        /**
         * Telegram иногда поздно инициализирует WebApp
         */
        await new Promise((resolve) => setTimeout(resolve, 500));

        /**
         * Redirect
         */
        if (startParam) {
          console.log(
            `[MiniApp] Redirecting to /client/${startParam}`
          );

          startTransition(() => {
            setIsRedirecting(true);

            router.replace(`/client/${startParam}`);
          });

          return;
        }

        console.log("[MiniApp] start_param not found");

      } catch (error) {
        console.error("[MiniApp] ERROR:", error);
      }
    }

    init();

  }, [router, searchParams, startTransition]);

  /**
   * Loader while redirecting
   */
  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">

          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Завантаження...
          </p>

        </div>
      </div>
    );
  }

  /**
   * Default app
   */
  return <MiniAppShell />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Завантаження...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}