"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { LogoUploader } from "@/components/shared/LogoUploader";
import { useTelegram } from "@/components/providers/TelegramProvider";
import type { AiTone, MasterCategory, OnboardingPayload } from "@/types";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 6;

const CATEGORIES: { id: MasterCategory; label: string; icon: string }[] = [
  { id: "beauty", label: "Б'юті", icon: "💅" },
  { id: "health", label: "Здоров'я", icon: "🧘" },
  { id: "education", label: "Освіта", icon: "📚" },
  { id: "auto", label: "Авто", icon: "🚗" },
  { id: "other", label: "Інше", icon: "🎨" },
];

const TONES: { id: AiTone; label: string; desc: string }[] = [
  {
    id: "friendly",
    label: "Дружній",
    desc: "Турботливий, теплий стиль спілкування",
  },
  {
    id: "professional",
    label: "Професійний",
    desc: "Стриманий, діловий тон",
  },
  {
    id: "caring",
    label: "Дбайливий",
    desc: "М'який, уважний до клієнта",
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

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const finishOnboarding = async () => {
    if (!userId || !category) return;

    setLoading(true);
    setError(null);

    try {
      const payload: OnboardingPayload = {
        telegram_id: userId,
        username,
        business_name: businessName.trim(),
        category,
        location: location.trim() || null,
        tone,
        logo_url: logoUrl,
      };

      await apiFetch<{ success: boolean }>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setDone(true);
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
            className="mt-6 w-full"
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
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[14px] border p-4 transition-all",
                  category === cat.id
                    ? "border-zinc-900 bg-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900",
                )}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.label}</span>
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
                "w-full rounded-[14px] border p-4 text-left transition-all",
                tone === t.id
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
              )}
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {t.label}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t.desc}
              </p>
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
            <Button
              className="flex-1"
              disabled={loading}
              onClick={finishOnboarding}
            >
              {loading ? "Збереження…" : "Завершити"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
