"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STAR_PLAN_PRICES } from "@/lib/stars-plans";
import { CreditCard, RefreshCw } from "lucide-react";

type PaymentRequiredProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
  status?: string; // додано
};

function getStatusMessage(status?: string): string {
  switch (status) {
    case "trial":
      return "Ваш триал завершився. 🕒";
    case "expired":
      return "Ваша підписка закінчилась. 💳";
    case "cancelled":
      return "Підписку скасовано. ❌";
    default:
      return "Підписка неактивна.";
  }
}

export function PaymentRequired({
  onRefresh,
  refreshing = false,
  status,
}: PaymentRequiredProps) {
  const message = getStatusMessage(status);

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4 py-8">
      <div className="absolute inset-0 -z-10 -mx-4">
        <div className="min-h-screen bg-linear-to-br from-transparent from-10% via-[#6ca6fc]/10 via-30% to-[#ffd75e]/10 dark:via-[#556a7d]/10 dark:to-[#625c42]/10" />
      </div>

      <Card className="w-full border-zinc-200/80 bg-white/90 p-6 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
          <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {message}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Щоб продовжити користуватися AI-адміністратором, оберіть тариф і
          оплатіть підписку через Telegram Stars.
        </p>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          Перший місяць — {STAR_PLAN_PRICES.monthly.amount} Stars, річна —{" "}
          {STAR_PLAN_PRICES.yearly.amount} Stars.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/settings/payment">
            <Button className="h-12 w-full">Перейти до оплати</Button>
          </Link>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              disabled={refreshing}
              onClick={onRefresh}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Оновити статус
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}