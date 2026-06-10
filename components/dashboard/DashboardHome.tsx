"use client";

import { useEffect, useState } from "react";
import { TabBar, type TabId } from "@/components/shared/TabBar";
import { HomeTab } from "@/components/dashboard/HomeTab";
import { ServicesTab } from "@/components/dashboard/ServicesTab";
import { BookingsTab } from "@/components/dashboard/BookingsTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { StatisticsTab } from "@/components/dashboard/StatisticsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import type { MasterWithMeta } from "@/types";
import { Bell, Calendar, LinkIcon, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { getClientStartAppLink } from "@/lib/referral";
import { isSubscriptionActive } from "@/lib/subscription";
import { SubscriptionExpiredModal } from "@/components/dashboard/SubscriptionExpiredModal";

type DashboardHomeProps = {
  master: MasterWithMeta;
  onMasterUpdate: () => void;
};

export function DashboardHome({ master, onMasterUpdate }: DashboardHomeProps) {
  const [tab, setTab] = useState<TabId>("home");

  const [copied, setCopied] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!isSubscriptionActive(master.subscription)) {
      setShowSubscriptionModal(true);
    }
  }, [master.subscription]);

  const clientLink = getClientStartAppLink(master);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Не вдалося скопіювати посилання", err);
    }
  };

  const [showPendingBookings, setShowPendingBookings] = useState(false);

  const navigateTab = (
    next: TabId,
    options?: { showPending?: boolean },
  ) => {
    if (options?.showPending) {
      setShowPendingBookings(true);
    } else if (next !== "bookings") {
      setShowPendingBookings(false);
    }
    setTab(next);
  };


  return (

    <div className="mx-auto min-h-screen w-full max-w-lg pb-24 relative">
      <div className="absolute top-0 right-0 left-0 inset-0 -z-10 -mx-4 ">
        <div className="min-h-screen h-full w-full flex bg-linear-to-br  from-transparent from-10% via-[#6ca6fc]/15 dark:via-[#556a7d]/20 via-30%
         to-[#ffd75e]/15 dark:to-[#625c42]/20 to-90% animate-gradient-x"  />
      </div>
      <header className="sticky top-0 z-40 border-0 border-zinc-200/80  px-4 py-3 backdrop-blur-xl dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {master.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={master.logo_url}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <Calendar className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {master.business_name}
              </p>
              <p className="text-xs text-zinc-500"> ZapysUA</p>
            </div>
          </div>
          {/* Right side */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={copyLink}
              title="Скопіювати посилання для клієнтів"
            >
              <LinkIcon className="size-5" strokeWidth={1} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTab("settings")}
              title="Налаштування"
            >
              <Settings className="size-5" strokeWidth={1} />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {tab === "home" && (
          <HomeTab master={master} onNavigateTab={navigateTab} />
        )}
        {tab === "services" && <ServicesTab />}
        {tab === "bookings" && (
          <BookingsTab
            master={master}
            onNavigateTab={navigateTab}
            showPendingList={showPendingBookings}
            onPendingListShown={() => setShowPendingBookings(false)}
          />
        )}
        {tab === "clients" && <ClientsTab master={master} />}
        {tab === "statistics" && <StatisticsTab master={master} />}
        {tab === "settings" && (
          <SettingsTab master={master} onMasterUpdate={onMasterUpdate} />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />

      {copied && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          Посилання скопійовано
        </div>
      )}

      <SubscriptionExpiredModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>

  );
}
