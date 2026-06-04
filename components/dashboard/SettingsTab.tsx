"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { parseWorkingHours, WEEKDAYS } from "@/lib/working-hours";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoUploader } from "@/components/shared/LogoUploader";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { AiTone, MasterWithMeta, WorkingHours } from "@/types";

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
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState(master.business_name);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setBusinessName(master.business_name);
  }, [master.business_name]);

  const botUsername =
    process.env.NEXT_PUBLIC_BOT_USERNAME ?? "ZapysUaBot";
  const referralLink = `https://t.me/${botUsername}?start=ref_${master.id}`;

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
    setSaving(true);
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
      setSaving(false);
    }
  };

  const saveBusinessName = async () => {
    const trimmed = businessName.trim();
    if (trimmed.length < 2) {
      setMessage("Назва занадто коротка");
      return;
    }

    setSavingName(true);
    try {
      await apiFetch("/api/masters", {
        method: "PATCH",
        body: JSON.stringify({ business_name: trimmed }),
      });
      setMessage("Назву змінено");
      onMasterUpdate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSavingName(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
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

      <Card className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Назва бізнесу
        </p>
        <Input
          placeholder="Назва салону або майстра"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={savingName || businessName.trim().length < 2}
          onClick={saveBusinessName}
        >
          {savingName ? "Збереження…" : "Зберегти"}
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
              disabled={saving}
              onClick={saveWorkingHours}
            >
              {saving ? "Збереження…" : "Зберегти графік"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Персональне посилання
        </p>
        <p className="break-all text-xs text-zinc-500">{referralLink}</p>
        <Button variant="outline" className="w-full" onClick={copyLink}>
          {copied ? "✓ Скопійовано" : "Скопіювати"}
        </Button>
      </Card>
    </div>
  );
}
