"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniAppShell } from "@/components/MiniAppShell";
import { LoaderCircle } from "lucide-react";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStartParam = searchParams.get("startapp")?.trim() || null;

  const [resolved, setResolved] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(Boolean(urlStartParam));

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const tgStartParam = tg?.initDataUnsafe?.start_param?.trim() || null;

    console.log("startapp from URL:", urlStartParam);
    console.log("startapp from Telegram:", tgStartParam);

    const finalStartParam = urlStartParam || tgStartParam;

    if (finalStartParam) {
      setIsRedirecting(true);
      router.replace(`/client/${encodeURIComponent(finalStartParam)}`);
      setResolved(true);
      return;
    }

    setIsRedirecting(false);
    setResolved(true);
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
