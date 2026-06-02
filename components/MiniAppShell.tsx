"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import type { MasterWithMeta } from "@/types";
import { LoaderCircle } from "lucide-react";

export function MiniAppShell() {
  const { ready, userId } = useTelegram();
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
      console.error("[MiniAppShell]", err);
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) {
      loadMaster();
    }
  }, [ready, loadMaster]);

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto mb-3 h-10 w-10 animate-spin text-amber-500 dark:text-amber-500" strokeWidth={1.5} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Завантаження…</p>
      </div>
    </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Відкрийте цей додаток через Telegram бота @ZapysUaBot.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!master?.is_onboarded) {
    return (
      <OnboardingWizard
        onComplete={() => {
          loadMaster();
        }}
      />
    );
  }

  return (
    <DashboardHome master={master} onMasterUpdate={loadMaster} />
  );
}
