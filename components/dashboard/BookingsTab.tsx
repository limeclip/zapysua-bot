"use client";

import Link from "next/link";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { Button } from "@/components/ui/button";
import type { MasterWithMeta } from "@/types";
import type { TabId } from "@/components/shared/TabBar";
import { List } from "lucide-react";

type BookingsTabProps = {
  master: MasterWithMeta;
  onNavigateTab: (tab: TabId) => void;
};

export function BookingsTab({ master, onNavigateTab }: BookingsTabProps) {
  return (
    <SubscriptionGate master={master}>
      <div className="space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Календар
          </h2>
          <Link href="/bookings">
            <Button variant="ghost" size="sm">
              <List className="h-4 w-4" />
              Список
            </Button>
          </Link>
        </div>
        <CalendarView
          master={master}
          onOpenSettings={() => onNavigateTab("settings")}
        />
      </div>
    </SubscriptionGate>
  );
}
