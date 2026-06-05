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
        // INIT TELEGRAM
        if (tg) {
          tg.ready();
          tg.expand();
        }

        console.log("========== TELEGRAM MINI APP ==========");
        console.log("FULL URL:", window.location.href);
        console.log("SEARCH:", window.location.search);
        console.log("INIT DATA:", tg?.initData);
        console.log("INIT DATA UNSAFE:", tg?.initDataUnsafe);

        const urlStartParam =
          searchParams.get("startapp")?.trim() ||
          searchParams.get("tgWebAppStartParam")?.trim() ||
          null;
        const tgStartParam =
          tg?.initDataUnsafe?.start_param?.trim() || null;
        const startParam = urlStartParam || tgStartParam;

        console.log("[MiniApp] startapp from URL:", urlStartParam);
        console.log("[MiniApp] start_param from Telegram:", tgStartParam);
        console.log("[MiniApp] final start param:", startParam);

        /**
         * TELEGRAM SOMETIMES NEEDS DELAY
         */
        await new Promise((resolve) => setTimeout(resolve, 500));

        /**
         * REDIRECT
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

        console.log("[MiniApp] start_param NOT FOUND");

      } catch (error) {
        console.error("[MiniApp] ERROR:", error);
      }
    }

    init();

  }, [router, searchParams, startTransition]);

  /**
   * LOADER
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
   * DEFAULT PAGE
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