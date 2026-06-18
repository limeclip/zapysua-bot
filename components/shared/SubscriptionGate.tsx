"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isSubscriptionActive } from "@/lib/subscription";
import { STAR_PLAN_PRICES } from "@/lib/stars-plans";
import type { MasterWithMeta } from "@/types";
import { CreditCard } from "lucide-react";

export function SubscriptionGate({
  master,
  children,
}: {
  master: MasterWithMeta;
  children: React.ReactNode;
}) {
  if (isSubscriptionActive(master.subscription)) {
    return <>{children}</>;
  }

  return (
    <Card className="py-8 text-center">
      <CreditCard className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
      <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
        Підписка неактивна
      </h2>
      <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
        Ваш триал завершився. Щоб продовжити користуватися сервісом, оберіть
        тариф і оплатіть через Telegram Stars.
      </p>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
        Місяць — {STAR_PLAN_PRICES.monthly.amount} Stars, рік —{" "}
        {STAR_PLAN_PRICES.yearly.amount} Stars.
      </p>
      <Link href="/settings/payment">
        <Button className="w-full">Перейти до оплати</Button>
      </Link>
    </Card>
  );
}
