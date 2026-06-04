"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

function StartRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const startapp = searchParams.get("startapp")?.trim();

  useEffect(() => {
    if (startapp) {
      router.replace(`/client/${encodeURIComponent(startapp)}`);
    }
  }, [startapp, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
      <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" />
      <p className="text-sm text-zinc-500">Завантаження…</p>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      }
    >
      <StartRedirect />
    </Suspense>
  );
}
