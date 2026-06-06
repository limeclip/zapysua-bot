"use client";

import Link from "next/link";
import { ClientsPageContent } from "@/components/clients/ClientsPageContent";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { Button } from "@/components/ui/button";
import type { MasterWithMeta } from "@/types";
import { ExternalLink } from "lucide-react";

type ClientsTabProps = {
  master: MasterWithMeta;
};

export function ClientsTab({ master }: ClientsTabProps) {
  return (
    <SubscriptionGate master={master}>
      <div className="space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Клієнти
          </h2>
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
              Повний список
            </Button>
          </Link>
        </div>
        <ClientsPageContent master={master} />
      </div>
    </SubscriptionGate>
  );
}
