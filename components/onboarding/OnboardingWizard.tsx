"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { LogoUploader } from "@/components/shared/LogoUploader";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { STAR_PLAN_PRICES, type StarPlanId } from "@/lib/stars-plans";
import { hasPaidSubscriptionActive } from "@/lib/subscription";
import type { AiTone, MasterCategory, MasterWithMeta, OnboardingPayload } from "@/types";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Car,
  Gift,
  GraduationCap,
  Heart,
  HeartHandshake,
  LoaderCircle,
  Package,
  Smile,
  Sparkles,
  Star,
} from "lucide-react";

const TOTAL_STEPS = 7;

type OnboardingPlan = "trial" | StarPlanId;

export const CATEGORIES: {
  id: MasterCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
    {
      id: "beauty",
      label: "Б'юті",
      icon: <Sparkles className="size-6" strokeWidth={1.5} />,
      description: "Салон краси, манікюр, перукарня, візаж, брови, макіяж, лазерна епіляція",
    },
    {
      id: "health",
      label: "Здоров'я",
      icon: <Heart className="size-6" strokeWidth={1.5} />,
      description: "Масаж, йога, психолог, медичні послуги, фітнес, дієтологія",
    },
    {
      id: "education",
      label: "Освіта",
      icon: <GraduationCap className="size-6" strokeWidth={1.5} />,
      description: "Репетитори, курси, тренінги, навчальні центри, онлайн-школи",
    },
    {
      id: "auto",
      label: "Авто",
      icon: <Car className="size-6" strokeWidth={1.5} />,
      description: "Автосервіс, шиномонтаж, мийка, діагностика, тюнінг, заправка",
    },
    {
      id: "other",
      label: "Інше",
      icon: <Package className="size-6" strokeWidth={1.5} />,
      description: "Юридичні послуги, консультації, ремонт, прибирання, доставка",
    },
  ];

const TONES: { id: AiTone; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "friendly",
    label: "Дружній",
    desc: "Турботливий, теплий стиль спілкування",
    icon: <Smile className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    id: "professional",
    label: "Професійний",
    desc: "Стриманий, діловий тон",
    icon: <Briefcase className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    id: "caring",
    label: "Дбайливий",
    desc: "М'який, уважний до клієнта",
    icon: <HeartHandshake className="h-5 w-5" strokeWidth={1.5} />,
  },
];

type OnboardingWizardProps = {
  onComplete: () => void;
};

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { userId, username } = useTelegram();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<MasterCategory | null>(null);
  const [location, setLocation] = useState("");
  const [tone, setTone] = useState<AiTone>("friendly");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan>("trial");
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submitOnboarding = async (skipTrial: boolean) => {
    const payload: OnboardingPayload = {
      telegram_id: userId!,
      username,
      business_name: businessName.trim(),
      category: category!,
      location: location.trim() || null,
      tone,
      logo_url: logoUrl,
      skip_trial: skipTrial,
    };

    await apiFetch<{ success: boolean }>("/api/onboarding", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  const openInvoice = (invoiceLink: string) => {
    const tg = window.Telegram?.WebApp;
    if (typeof tg?.openTelegramLink === "function") {
      tg.openTelegramLink(invoiceLink);
    } else if (typeof tg?.openLink === "function") {
      tg.openLink(invoiceLink);
    } else {
      window.open(invoiceLink, "_blank", "noopener,noreferrer");
    }
  };

  const waitForPayment = async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const data = await apiFetch<{ master: MasterWithMeta | null }>(
          "/api/masters/me",
        );
        if (hasPaidSubscriptionActive(data.master?.subscription ?? null)) {
          return true;
        }
      } catch {
        // продовжуємо очікування
      }
    }
    return false;
  };

  const finishOnboarding = async () => {
    if (!userId || !category) return;

    setLoading(true);
    setError(null);
    setPaymentMessage(null);

    try {
      if (selectedPlan === "trial") {
        await submitOnboarding(false);
        setDone(true);
        return;
      }

      await submitOnboarding(true);

      const invoiceData = await apiFetch<{ invoiceLink: string }>(
        "/api/stars/create-invoice",
        {
          method: "POST",
          body: JSON.stringify({ plan: selectedPlan }),
        },
      );

      openInvoice(invoiceData.invoiceLink);
      setPaymentMessage(
        "Відкрито вікно оплати. Зачекайте підтвердження…",
      );

      const paid = await waitForPayment();
      if (paid) {
        setDone(true);
      } else {
        setPaymentMessage(
          "Оплату ще не підтверджено. Спробуйте ще раз або оберіть пробний період.",
        );
      }
    } catch (err) {
      console.error("[OnboardingWizard]", err);
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-in fade-in">
        <div className="mb-6 text-6xl">🎉</div>
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Вітаємо в ZapysUa!
        </h1>
        <p className="mb-8 max-w-sm text-zinc-500 dark:text-zinc-400">
          Ваш AI-адміністратор готовий приймати записи 24/7.
        </p>
        <Button
          size="lg"
          className="w-full max-w-xs"
          onClick={() => {
            onComplete();
          }}
        >
          Перейти до дашборду
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-8 pt-4">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Налаштування профілю
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Займе близько 2 хвилин
        </p>
      </div>

      <ProgressBar step={step} total={TOTAL_STEPS} className="mb-8" />

      {error && (
        <div className="mb-4 rounded-[14px] bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card className="animate-in fade-in slide-in-from-bottom-2">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Назва бізнесу
          </label>
          <Input
            placeholder="Наприклад: Студія краси Олена"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            autoFocus
          />
          <Button
            className="mt-6 w-full "
            disabled={businessName.trim().length < 2}
            onClick={next}
          >
            Далі
          </Button>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-3 animate-in fade-in">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Оберіть категорію
          </p>
          <div className="grid grid-cols-1 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                  category === cat.id
                    ? "border-foreground bg-foreground text-white shadow-sm "
                    : " bg-secondary hover:shadow-md border-border/60",
                )}
              >
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center shrink-0">
                  <span className="text-2xl text-foreground">{cat.icon}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-md font-medium">{cat.label}</span>
                  <span className={cn(
                    "text-sm text-muted-foreground text-left",
                    category === cat.id
                      ? "text-white"
                      : "",
                  )}>{cat.description}</span>
                </div>

              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={back}>
              Назад
            </Button>
            <Button className="flex-1" disabled={!category} onClick={next}>
              Далі
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card className="animate-in fade-in">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Адреса або місто
          </label>
          <Input
            placeholder="Київ, вул. Хрещатик 1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={back}>
              Назад
            </Button>
            <Button variant="secondary" className="flex-1" onClick={next}>
              Пропустити
            </Button>
            <Button className="flex-1" onClick={next}>
              Далі
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <div className="space-y-3 animate-in fade-in">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Тон AI-адміністратора
          </p>
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={cn(
                "w-full rounded-2xl gap-4 border p-4 text-left transition-all",
                tone === t.id
                  ? "border-foreground bg-foreground text-white shadow-sm "
                  : " bg-secondary hover:shadow-md border-border/60",
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center shrink-0">
                  <span className="text-2xl text-foreground">  {t.icon}</span>
                </div>
                <div className="flex flex-col items-start">
                  <p className="font-medium ">
                    {t.label}
                  </p>
                  <span className={cn(
                    "text-sm text-muted-foreground text-left",
                    tone === t.id
                      ? "text-white"
                      : "",
                  )}>
                  {t.desc}
                </span>
                </div>
              </div>
            </button>
          ))}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={back}>
              Назад
            </Button>
            <Button className="flex-1" onClick={next}>
              Далі
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="animate-in fade-in">
          <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Логотип (необов&apos;язково)
          </p>
          <LogoUploader
            previewUrl={logoUrl}
            onUploaded={(url) => setLogoUrl(url)}
            onSkip={next}
            showSkip
          />
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={back}>
              Назад
            </Button>
            <Button className="flex-1" onClick={next}>
              {logoUrl ? "Далі" : "Пропустити"}
            </Button>
          </div>
        </div>
      )}

      {step === 6 && (
        <Card className="animate-in fade-in">
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-100">
            Перевірте дані
          </h2>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="text-zinc-400">Назва:</span> {businessName}
            </li>
            <li>
              <span className="text-zinc-400">Категорія:</span>{" "}
              {CATEGORIES.find((c) => c.id === category)?.label}
            </li>
            <li>
              <span className="text-zinc-400">Локація:</span>{" "}
              {location || "—"}
            </li>
            <li>
              <span className="text-zinc-400">Тон AI:</span>{" "}
              {TONES.find((t) => t.id === tone)?.label}
            </li>
            <li>
              <span className="text-zinc-400">Логотип:</span>{" "}
              {logoUrl ? "✓ завантажено" : "—"}
            </li>
          </ul>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={back}>
              Назад
            </Button>
            <Button className="flex-1" onClick={next}>
              Далі
            </Button>
          </div>
        </Card>
      )}

      {step === 7 && (
        <div className="space-y-3 animate-in fade-in">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Оберіть тариф
          </p>

          <button
            type="button"
            onClick={() => setSelectedPlan("trial")}
            className={cn(
              "w-full rounded-2xl border p-4 text-left transition-all",
              selectedPlan === "trial"
                ? "border-foreground bg-foreground text-white shadow-sm"
                : "border-border/60 bg-secondary hover:shadow-md",
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background">
                <Gift className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium">Тріал 7 днів</p>
                <p
                  className={cn(
                    "text-sm text-muted-foreground",
                    selectedPlan === "trial" && "text-white/80",
                  )}
                >
                  Безкоштовно — спробуйте всі можливості
                </p>
              </div>
            </div>
          </button>

          {(Object.keys(STAR_PLAN_PRICES) as StarPlanId[]).map((planId) => {
            const plan = STAR_PLAN_PRICES[planId];
            const selected = selectedPlan === planId;
            return (
              <button
                key={planId}
                type="button"
                onClick={() => setSelectedPlan(planId)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  selected
                    ? "border-foreground bg-foreground text-white shadow-sm"
                    : "border-border/60 bg-secondary hover:shadow-md",
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background">
                    <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {plan.cardLabel} — {plan.amount}{" "}
                      <Star className="inline h-4 w-4 fill-amber-400 text-amber-400" />
                    </p>
                    <p
                      className={cn(
                        "text-sm text-muted-foreground",
                        selected && "text-white/80",
                      )}
                    >
                      {plan.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {paymentMessage && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {paymentMessage}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={back}>
              Назад
            </Button>
            <Button
              className="flex-1"
              disabled={loading}
              onClick={finishOnboarding}
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {selectedPlan === "trial" ? "Збереження…" : "Очікування оплати…"}
                </>
              ) : selectedPlan === "trial" ? (
                "Завершити"
              ) : (
                `Оплатити ${STAR_PLAN_PRICES[selectedPlan].amount} Stars`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
