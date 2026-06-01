"use client";

import { useState } from "react";
import { TabBar, type TabId } from "@/components/shared/TabBar";
import { HomeTab } from "@/components/dashboard/HomeTab";
import { ServicesTab } from "@/components/dashboard/ServicesTab";
import { BookingsTab } from "@/components/dashboard/BookingsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import type { MasterWithMeta } from "@/types";

type DashboardHomeProps = {
  master: MasterWithMeta;
  onMasterUpdate: () => void;
};

export function DashboardHome({ master, onMasterUpdate }: DashboardHomeProps) {
  const [tab, setTab] = useState<TabId>("home");

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg pb-24">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center gap-3">
          {master.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={master.logo_url}
              alt=""
              className="h-9 w-9 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-lg dark:bg-zinc-800">
              🤖
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              ZapysUa
            </p>
            <p className="text-xs text-zinc-500">{master.business_name}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {tab === "home" && <HomeTab master={master} />}
        {tab === "services" && <ServicesTab />}
        {tab === "bookings" && <BookingsTab />}
        {tab === "settings" && (
          <SettingsTab master={master} onMasterUpdate={onMasterUpdate} />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
