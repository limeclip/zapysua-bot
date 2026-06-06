"use client";

import { cn } from "@/lib/utils";
import { Calendar, Settings } from "lucide-react";

export type ClientAccountTabId = "bookings" | "settings";

const TABS: {
  id: ClientAccountTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "bookings",
    label: "Мої записи",
    icon: <Calendar className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    id: "settings",
    label: "Налаштування",
    icon: <Settings className="h-5 w-5" strokeWidth={1.5} />,
  },
];

export function ClientAccountTabBar({
  active,
  onChange,
}: {
  active: ClientAccountTabId;
  onChange: (tab: ClientAccountTabId) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
              active === tab.id
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 dark:text-zinc-500",
            )}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
