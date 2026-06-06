"use client";

import { ClientsPageContent } from "@/components/clients/ClientsPageContent";
import { MiniAppPageShell } from "@/components/MiniAppPageShell";

export default function ClientsPage() {
  return (
    <MiniAppPageShell title="Клієнти">
      {(master) => <ClientsPageContent master={master} />}
    </MiniAppPageShell>
  );
}
