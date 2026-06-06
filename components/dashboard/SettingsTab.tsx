"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { getClientStartAppLink } from "@/lib/referral";
import {
  isValidSlug,
  normalizeSlug,
  slugValidationMessage,
} from "@/lib/slug";
import { parseWorkingHours, WEEKDAYS } from "@/lib/working-hours";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LogoUploader } from "@/components/shared/LogoUploader";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { MASTER_CATEGORY_OPTIONS } from "@/lib/master-category";
import {
  parseSocialLinksInput,
  socialLinksToForm,
} from "@/lib/social-links";
import type { AiTone, MasterCategory, MasterWithMeta, WorkingHours } from "@/types";
import { Check, LoaderCircle } from "lucide-react";

const TONE_OPTIONS: { value: AiTone; label: string }[] = [
  { value: "friendly", label: "Дружній" },
  { value: "professional", label: "Професійний" },
  { value: "caring", label: "Дбайливий" },
];

type SettingsTabProps = {
  master: MasterWithMeta;
  onMasterUpdate: () => void;
};

export function SettingsTab({ master, onMasterUpdate }: SettingsTabProps) {
  const [tone, setTone] = useState<AiTone>(
    master.ai_settings?.tone ?? "friendly",
  );
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    parseWorkingHours(master.working_hours),
  );
  const [showHours, setShowHours] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState(master.business_name);
  const [slug, setSlug] = useState(master.slug ?? "");
  const [description, setDescription] = useState(master.description ?? "");
  const [category, setCategory] = useState<MasterCategory>(master.category);
  const [location, setLocation] = useState(master.location ?? "");
  const [phone, setPhone] = useState(master.phone ?? "");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTelegram, setSocialTelegram] = useState("");

  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setBusinessName(master.business_name);
    setSlug(master.slug ?? "");
    setSlugAvailable(null);
    setDescription(master.description ?? "");
    setCategory(master.category);
    setLocation(master.location ?? "");
    setPhone(master.phone ?? "");
    const social = socialLinksToForm(master.social_links);
    setSocialInstagram(social.instagram);
    setSocialTiktok(social.tiktok);
    setSocialFacebook(social.facebook);
    setSocialTelegram(social.telegram);
  }, [master]);

  const clientLink = getClientStartAppLink(master);

  const saveTone = async (newTone: AiTone) => {
    setTone(newTone);
    try {
      await apiFetch("/api/masters/ai-tone", {
        method: "PATCH",
        body: JSON.stringify({ tone: newTone }),
      });
      setMessage("Тон AI оновлено");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка");
    }
  };

  const saveWorkingHours = async () => {
    setSavingHours(true);
    try {
      await apiFetch("/api/masters/working-hours", {
        method: "PATCH",
        body: JSON.stringify({ working_hours: workingHours }),
      });
      setMessage("Робочі години збережено");
      onMasterUpdate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSavingHours(false);
    }
  };

  const checkSlug = async () => {
    const normalized = normalizeSlug(slug);
    if (!normalized) {
      setSlugAvailable(null);
      setMessage("Введіть slug для перевірки");
      return;
    }
    const validationError = slugValidationMessage(normalized);
    if (validationError) {
      setMessage(validationError);
      setSlugAvailable(false);
      return;
    }

    setCheckingSlug(true);
    setSlugAvailable(null);
    try {
      const data = await apiFetch<{ available: boolean; message: string | null }>(
        `/api/masters/slug/check?slug=${encodeURIComponent(normalized)}`,
      );
      setSlugAvailable(data.available);
      setMessage(
        data.available ? "Посилання вільне" : (data.message ?? "Зайнято"),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка перевірки");
    } finally {
      setCheckingSlug(false);
    }
  };

  const saveProfile = async () => {
    const trimmedName = businessName.trim();
    if (trimmedName.length < 2) {
      setMessage("Назва бізнесу занадто коротка");
      return;
    }

    const normalizedSlug = normalizeSlug(slug);
    if (normalizedSlug) {
      const validationError = slugValidationMessage(normalizedSlug);
      if (validationError || !isValidSlug(normalizedSlug)) {
        setMessage(validationError ?? "Невірний формат slug");
        return;
      }
    }

    setSavingProfile(true);
    setSlugAvailable(null);
    try {
      await apiFetch("/api/masters", {
        method: "PATCH",
        body: JSON.stringify({
          business_name: trimmedName,
          slug: normalizedSlug || null,
          description: description.trim() || null,
          category,
          location: location.trim() || null,
          phone: phone.trim() || null,
          social_links: parseSocialLinksInput({
            instagram: socialInstagram,
            tiktok: socialTiktok,
            facebook: socialFacebook,
            telegram: socialTelegram,
          }),
        }),
      });
      setMessage("Профіль оновлено");
      onMasterUpdate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSavingProfile(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Не вдалося скопіювати");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Налаштування
      </h2>

      {message && (
        <p className="text-sm text-zinc-500">{message}</p>
      )}

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Профіль
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Основна інформація для клієнтської сторінки
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Назва бізнесу *</label>
          <Input
            placeholder="Назва салону або майстра"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Коротке посилання (slug)</label>
          <p className="text-[11px] text-zinc-400">
            Латинські літери, цифри або дефіс. Без пробілів. Крапку використовувати не можна.
          </p>
          <Input
            placeholder="margo-nails"
            value={slug}
            onChange={(e) => {
              setSlug(
                e.target.value.toLowerCase().replace(/\s/g, ""),
              );
              setSlugAvailable(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={checkingSlug || !slug.trim()}
            onClick={checkSlug}
          >
            {checkingSlug ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              "Перевірити доступність slug"
            )}
          </Button>
          {slugAvailable === true && (
            <p className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Посилання вільне
            </p>
          )}
          {slugAvailable === false && (
            <p className="text-xs text-red-500">Посилання зайняте або невірне</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Категорія</label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as MasterCategory)}
          >
            {MASTER_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Опис</label>
          <Textarea
            placeholder="Розкажіть про себе та послуги"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Локація</label>
          <Input
            placeholder="м. Київ, вул. Хрещатик 1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Контакти та соцмережі
          </p>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500">Телефон</label>
            <Input
              type="tel"
              placeholder="+380..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Instagram"
              value={socialInstagram}
              onChange={(e) => setSocialInstagram(e.target.value)}
            />
            <Input
              placeholder="TikTok"
              value={socialTiktok}
              onChange={(e) => setSocialTiktok(e.target.value)}
            />
            <Input
              placeholder="Facebook"
              value={socialFacebook}
              onChange={(e) => setSocialFacebook(e.target.value)}
            />
            <Input
              placeholder="Telegram"
              value={socialTelegram}
              onChange={(e) => setSocialTelegram(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="w-full"
          disabled={savingProfile || businessName.trim().length < 2}
          onClick={saveProfile}
        >
          {savingProfile ? "Збереження…" : "Зберегти зміни"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Посилання для клієнтів
        </p>
        <p className="text-xs text-zinc-500">
          Скопіюйте це посилання та надішліть клієнту. Воно відкриває Mini App
          з вашим записом.
        </p>
        <p className="break-all text-xs text-zinc-500">{clientLink}</p>
        <Button variant="outline" className="w-full" onClick={copyLink}>
          {copied ? "Скопійовано" : "Копіювати посилання"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Тема інтерфейсу
        </p>
        <ThemeToggle />
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Логотип
        </p>
        <LogoUploader
          previewUrl={master.logo_url}
          showSkip={false}
          onUploaded={() => {
            setMessage("Логотип оновлено");
            onMasterUpdate();
          }}
        />
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Тон AI
        </p>
        <select
          value={tone}
          onChange={(e) => saveTone(e.target.value as AiTone)}
          className="h-12 w-full rounded-[14px] border border-zinc-200 bg-white px-4 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {TONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Card>

      <Card className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
          onClick={() => setShowHours(!showHours)}
        >
          <span>Робочі години</span>
          <span>{showHours ? "▲" : "▼"}</span>
        </button>

        {showHours && (
          <div className="space-y-4">
            {WEEKDAYS.map(({ key, label }) => {
              const day = workingHours[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) =>
                        setWorkingHours((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded"
                    />
                    {label}
                  </label>
                  {day.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={day.start}
                        onChange={(e) =>
                          setWorkingHours((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], start: e.target.value },
                          }))
                        }
                        className="h-10 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <input
                        type="time"
                        value={day.end}
                        onChange={(e) =>
                          setWorkingHours((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], end: e.target.value },
                          }))
                        }
                        className="h-10 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              className="w-full"
              disabled={savingHours}
              onClick={saveWorkingHours}
            >
              {savingHours ? "Збереження…" : "Зберегти графік"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
