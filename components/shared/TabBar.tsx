"use client";

import { cn } from "@/lib/utils";

export type TabId = "home" | "services" | "bookings" | "settings";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "home", label: "Головна", icon: "🏠" },
  { id: "services", label: "Послуги", icon: "📋" },
  { id: "bookings", label: "Записи", icon: "📅" },
  { id: "settings", label: "Налаштування", icon: "⚙️" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-w-[72px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
              active === tab.id
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 dark:text-zinc-500",
            )}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
