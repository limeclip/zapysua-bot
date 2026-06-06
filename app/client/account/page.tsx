"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import {
  ClientAccountTabBar,
  type ClientAccountTabId,
} from "@/components/client/ClientAccountTabBar";
import { ClientBookingsTab } from "@/components/client/ClientBookingsTab";
import { ClientSettingsTab } from "@/components/client/ClientSettingsTab";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientProfile } from "@/types";
import { ArrowLeft, User } from "lucide-react";

function getTelegramUserId(): number | null {
  if (typeof window === "undefined") return null;
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return typeof id === "number" ? id : null;
}

function getTelegramUserName(): string {
  if (typeof window === "undefined") return "";
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!user) return "";
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}

export default function ClientAccountPage() {
  const [tab, setTab] = useState<ClientAccountTabId>("bookings");
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsTelegram, setNeedsTelegram] = useState(false);

  const loadProfile = useCallback(async () => {
    const telegramId = getTelegramUserId();
    if (!telegramId) {
      setNeedsTelegram(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch<{ customer: ClientProfile }>(
        "/api/customers/me",
      );
      const customer = data.customer;
      if (!customer.name && getTelegramUserName()) {
        customer.name = getTelegramUserName();
      }
      setProfile(customer);
      setNeedsTelegram(false);
    } catch {
      setProfile({
        telegram_id: telegramId,
        name: getTelegramUserName(),
        phone: null,
        avatar_url: null,
        has_profile: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (needsTelegram) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <User className="mb-4 h-12 w-12 text-zinc-300" />
        <h1 className="text-lg font-semibold">Відкрийте через Telegram</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Клієнтський кабінет доступний лише в Telegram Mini App
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-in fade-in">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <User className="h-5 w-5 text-zinc-400" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {profile?.name || "Мій кабінет"}
            </h1>
            <p className="text-xs text-zinc-500">Особистий кабінет клієнта</p>
          </div>
        </div>
      </header>

      {tab === "bookings" && <ClientBookingsTab />}
      {tab === "settings" && (
        <ClientSettingsTab profile={profile} onUpdated={setProfile} />
      )}

      <ClientAccountTabBar active={tab} onChange={setTab} />
    </div>
  );
}
