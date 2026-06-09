"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, X } from "lucide-react";

type SubscriptionExpiredModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SubscriptionExpiredModal({
  open,
  onClose,
}: SubscriptionExpiredModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-expired-title"
    >
      <Card className="w-full max-w-md animate-in fade-in p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <h2
          id="subscription-expired-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Підписка закінчилась
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Щоб приймати нові записи та користуватися AI-адміністратором,
          оформіть підписку через Telegram Stars.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link href="/settings/payment" onClick={onClose}>
            <Button className="w-full">Перейти до оплати</Button>
          </Link>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Пізніше
          </Button>
        </div>
      </Card>
    </div>
  );
}
