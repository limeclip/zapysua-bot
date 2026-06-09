"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSubscriptionStatusLabel,
  hasPaidSubscriptionActive,
  isSubscriptionActive,
} from "@/lib/subscription";
import { STAR_PLAN_PRICES, type StarPlanId } from "@/lib/stars-plans";
import type { MasterWithMeta } from "@/types";
import {
  ArrowLeft,
  Check,
  CreditCard,
  LoaderCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatUkDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PaymentPageContent() {
  const router = useRouter();
  const [master, setMaster] = useState<MasterWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<StarPlanId>("monthly");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ master: MasterWithMeta | null }>(
        "/api/masters/me",
      );
      setMaster(data.master);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePay = async () => {
    setPaying(true);
    setError(null);
    setMessage(null);

    try {
      const data = await apiFetch<{ invoiceLink: string }>(
        "/api/stars/create-invoice",
        {
          method: "POST",
          body: JSON.stringify({ plan: selectedPlan }),
        },
      );

      const tg = window.Telegram?.WebApp;
      if (typeof tg?.openTelegramLink === "function") {
        tg.openTelegramLink(data.invoiceLink);
      } else if (typeof tg?.openLink === "function") {
        tg.openLink(data.invoiceLink);
      } else {
        window.open(data.invoiceLink, "_blank", "noopener,noreferrer");
      }

      setMessage(
        "Відкрито вікно оплати. Після підтвердження натисніть «Оновити статус».",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося оплатити");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-lg space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!master) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6 text-center">
        <p className="text-sm text-zinc-500">
          Увійдіть через Telegram бота, щоб керувати підпискою.
        </p>
      </div>
    );
  }

  const subscription = master.subscription;
  const active = isSubscriptionActive(subscription);
  const statusLabel = getSubscriptionStatusLabel(subscription);

  return (
    <div className="relative mx-auto min-h-screen max-w-lg px-4 pb-8 pt-6 animate-in fade-in">
      <div className="absolute inset-0 -z-10 -mx-4 dark:hidden">
        <div className="min-h-screen bg-linear-to-br from-transparent from-10% via-[#6ca6fc]/10 via-30% to-[#ffd75e]/10" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Підписка та оплата
          </h1>
          <p className="text-sm text-muted-foreground">Telegram Stars</p>
        </div>
      </div>

      <Card className="mb-6 border-zinc-200/80 bg-white/80 p-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {statusLabel}
            </p>
            {subscription?.status === "trial" && subscription.trial_end_date && (
              <p className="mt-1 text-sm text-muted-foreground">
                Пробний період до {formatUkDate(subscription.trial_end_date)}
              </p>
            )}
            {subscription?.status === "active" &&
              subscription.subscription_end_date && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Активна до{" "}
                  {formatUkDate(subscription.subscription_end_date)}
                </p>
              )}
            {!active && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Оплатіть підписку, щоб приймати нові записи та користуватися
                AI-адміністратором.
              </p>
            )}
          </div>
        </div>
      </Card>

      {!hasPaidSubscriptionActive(subscription) && (
        <>
          <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Оберіть тариф
          </p>

          <div className="mb-6 grid gap-3">
            {(Object.keys(STAR_PLAN_PRICES) as StarPlanId[]).map((planId) => {
              const plan = STAR_PLAN_PRICES[planId];
              const selected = selectedPlan === planId;
              return (
                <button
                  key={planId}
                  type="button"
                  onClick={() => setSelectedPlan(planId)}
                  className={cn(
                    "rounded-[14px] border p-4 text-left transition-all",
                    selected
                      ? "border-[#ffd75e] bg-zinc-50 ring-1 ring-[#ffd75e] dark:border-[#ffd75e] dark:bg-zinc-800 dark:ring-[#ffd75e]"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {plan.cardLabel} — {plan.amount}{" "}
                        <Star className="inline h-4 w-4 fill-amber-400 text-amber-400" />
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                    {selected && (
                      <Check className="h-5 w-5 shrink-0 text-zinc-900 dark:text-zinc-100" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          {message && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {message}
            </p>
          )}

          <Button className="mb-3 w-full h-12" disabled={paying} onClick={handlePay}>
            {paying ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Створення рахунку…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Оплатити {STAR_PLAN_PRICES[selectedPlan].amount} Stars
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 dark:border-white/30"
            onClick={load}
            disabled={loading}
          >
            Оновити статус
          </Button>
        </>
      )}

      {hasPaidSubscriptionActive(subscription) && (
        <Card className="p-4 text-center">
          <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Дякуємо! Ваша підписка активна.
          </p>
          <Link href="/" className="mt-4 block">
            <Button variant="outline" className="w-full">
              Повернутися до кабінету
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
