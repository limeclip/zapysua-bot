"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  Calendar1,
  Home,
  List,
  Settings,
  Users,
} from "lucide-react";

export type TabId =
  | "home"
  | "services"
  | "bookings"
  | "clients"
  | "statistics"
  | "settings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "Головна",
    icon: <Home className="h-6 w-6" strokeWidth={1.5} />,
  },
  {
    id: "services",
    label: "Послуги",
    icon: <List className="h-5 w-5" strokeWidth={1.5} />,
  },
  // {
  //   id: "bookings",
  //   label: "Записи",
  //   icon: <Calendar className="h-5 w-5" strokeWidth={1.5} />,
  // },
  {
    id: "clients",
    label: "Клієнти",
    icon: <Users className="h-6 w-6" strokeWidth={1.5} />,
  },
  {
    id: "statistics",
    label: "Статистика",
    icon: <BarChart3 className="h-6 w-6" strokeWidth={1.5} />,
  },
  {
    id: "settings",
    label: "Налашт.",
    icon: <Settings className="h-6 w-6" strokeWidth={1.5} />,
  },
];
const BOOKING: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "bookings",
    label: "Записи",
    icon: <Calendar1 className="h-6 w-6" strokeWidth={1.5} />,
  },
 
];
export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <>
    <nav className="fixed bottom-0 left-0 right-0 z-50  border-zinc-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-lg gap-1 pt-2 px-3 pb-2">
        <div className="bg-background border border-border/50 shadow-sm rounded-full flex items-center justify-around px-1 w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors cursor-pointer",
              active === tab.id
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 dark:text-zinc-500",
            )}
          >
            <span className="flex items-center justify-center leading-none">
              {tab.icon}
            </span>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
        </div>
         <div className="bg-foreground flex items-center justify-center w-16 px-1.5 border border-foreground h-14 rounded-full shadow-sm">
         {BOOKING.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 text-[9px] font-medium transition-colors cursor-pointer",
              active === tab.id
                ? "text-white dark:text-black"
                : "text-zinc-200 dark:text-zinc-700",
            )}
          >
            <span className="flex items-center justify-center leading-none">
              {tab.icon}
            </span>
            {/* <span className="truncate">{tab.label}</span> */}
          </button>
        ))}
         </div>
      </div>
     
    </nav>
    </>
  );
}
