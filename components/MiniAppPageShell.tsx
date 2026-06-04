"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { useTelegram } from "@/components/providers/TelegramProvider";
import type { MasterWithMeta } from "@/types";
import { ArrowLeft, LoaderCircle } from "lucide-react";

export function MiniAppPageShell({
  title,
  children,
}: {
  title: string;
  children: (master: MasterWithMeta) => React.ReactNode;
}) {
  const { ready } = useTelegram();
  const [master, setMaster] = useState<MasterWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaster = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ master: MasterWithMeta | null }>(
        "/api/masters/me",
      );
      setMaster(data.master);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadMaster();
  }, [ready, loadMaster]);

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !master?.is_onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-red-500">{error ?? "Пройдіть онбординг"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      {children(master)}
    </div>
  );
}
