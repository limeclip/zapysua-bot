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
    let startParam = searchParams.get("startapp");
    const tg = window.Telegram?.WebApp;

    if (!startParam && tg?.initDataUnsafe?.start_param) {
      startParam = tg.initDataUnsafe.start_param;
    }
    if (!startParam && searchParams.get("tgWebAppStartParam")) {
      startParam = searchParams.get("tgWebAppStartParam");
    }

    console.log("[MiniApp Home] URL:", window.location.href);
    console.log("[MiniApp Home] startapp from URL:", searchParams.get("startapp"));
    console.log("[MiniApp Home] start_param from Telegram:", tg?.initDataUnsafe?.start_param);
    console.log("[MiniApp Home] tgWebAppStartParam from URL:", searchParams.get("tgWebAppStartParam"));
    console.log("[MiniApp Home] Final startParam:", startParam);

    if (startParam) {
      console.log(`[MiniApp Home] Redirecting to /client/${startParam}`);
      startTransition(() => {
        setIsRedirecting(true);
        router.replace(`/client/${startParam}`);
      });
    } else {
      console.log("[MiniApp Home] No start_param, showing MiniAppShell");
    }

    if (tg) tg.ready();
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