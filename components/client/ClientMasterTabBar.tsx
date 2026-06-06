"use client";

import { cn } from "@/lib/utils";
import { Calendar, List } from "lucide-react";

export type ClientMasterTabId = "services" | "bookings";

const TABS: {
  id: ClientMasterTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "services",
    label: "Послуги",
    icon: <List className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    id: "bookings",
    label: "Мої записи",
    icon: <Calendar className="h-5 w-5" strokeWidth={1.5} />,
  },
];

export function ClientMasterTabBar({
  active,
  onChange,
}: {
  active: ClientMasterTabId;
  onChange: (tab: ClientMasterTabId) => void;
}) {
  return (
    <div className="flex gap-1 rounded-[14px] bg-zinc-100 p-1 dark:bg-zinc-800/80">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
            active === tab.id
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
