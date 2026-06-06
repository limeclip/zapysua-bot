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
          <div className="relative mx-auto mb-3 h-10 w-10">
            <svg
              className="animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="uaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#72a7fc" />
                  <stop offset="100%" stopColor="#ffd75e" />
                </linearGradient>
              </defs>
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="url(#uaGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="40 12.8"   // ← ОСНОВНА ЗМІНА: довжина дуги 50 (майже повне коло)
                fill="none"
              />
            </svg>
          </div>
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
