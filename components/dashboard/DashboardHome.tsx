"use client";

import { useState } from "react";
import { TabBar, type TabId } from "@/components/shared/TabBar";
import { HomeTab } from "@/components/dashboard/HomeTab";
import { ServicesTab } from "@/components/dashboard/ServicesTab";
import { BookingsTab } from "@/components/dashboard/BookingsTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { StatisticsTab } from "@/components/dashboard/StatisticsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import type { MasterWithMeta } from "@/types";
import { Bell, Calendar, LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import { getClientStartAppLink } from "@/lib/referral";

type DashboardHomeProps = {
  master: MasterWithMeta;
  onMasterUpdate: () => void;
};

export function DashboardHome({ master, onMasterUpdate }: DashboardHomeProps) {
  const [tab, setTab] = useState<TabId>("home");

  const [copied, setCopied] = useState(false);

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

  const navigateTab = (next: TabId) => setTab(next);
  

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg pb-24 relative">
      <div className="absolute top-0 right-0 left-0 inset-0 -z-10 -mx-4 dark:hidden">
        <div className="min-h-screen h-full w-full flex bg-linear-to-br  from-transparent from-10% via-[#6ca6fc]/10 dark:via-[#556a7d]/20 via-30%
         to-[#ffd75e]/10 dark:to-[#625c42]/20 to-90% animate-gradient-x"  />
      </div>
      <header className="sticky top-0 z-40 border-0 border-zinc-200/80  px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
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
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
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
            <Button variant={"ghost"} size={"icon"}>
              <Bell className="size-5" strokeWidth={1} />
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
          <BookingsTab master={master} onNavigateTab={navigateTab} />
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
    </div>
  );
}
