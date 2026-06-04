"use client";

import { StatisticsTab } from "@/components/dashboard/StatisticsTab";
import { MiniAppPageShell } from "@/components/MiniAppPageShell";

export default function StatisticsPage() {
  return (
    <MiniAppPageShell title="Статистика">
      {(master) => <StatisticsTab master={master} />}
    </MiniAppPageShell>
  );
}
