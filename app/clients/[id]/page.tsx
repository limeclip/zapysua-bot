"use client";

import { ClientDetailContent } from "@/components/clients/ClientDetailContent";
import { MiniAppPageShell } from "@/components/MiniAppPageShell";
import { use } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ClientDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <MiniAppPageShell title="Клієнт" backHref="/clients">
      {(master) => (
        <ClientDetailContent master={master} customerId={id} />
      )}
    </MiniAppPageShell>
  );
}
