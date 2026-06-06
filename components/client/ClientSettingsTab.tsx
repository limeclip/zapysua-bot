"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoUploader } from "@/components/shared/LogoUploader";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { ClientProfile } from "@/types";
import { LoaderCircle, User } from "lucide-react";

type ClientSettingsTabProps = {
  profile: ClientProfile | null;
  onUpdated: (profile: ClientProfile) => void;
};

export function ClientSettingsTab({
  profile,
  onUpdated,
}: ClientSettingsTabProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Введіть ім'я");
      return;
    }

    if (!profile?.has_profile) {
      setError("Профіль з'явиться після першого запису до майстра");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await apiFetch<{ customer: ClientProfile }>(
        "/api/customers/me",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: trimmedName,
            phone: phone.trim() || null,
            avatar_url: avatarUrl || null,
          }),
        },
      );
      onUpdated(data.customer);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <User className="h-4 w-4" />
          Профіль
        </div>

        <LogoUploader
          previewUrl={avatarUrl || null}
          onUploaded={setAvatarUrl}
          showSkip={false}
          variant="avatar"
          uploadEndpoint="/api/customers/me/avatar"
          responseField="avatar_url"
          inputId="client-avatar-upload"
          altText="Аватар"
        />

        <div>
          <label
            htmlFor="client-name"
            className="mb-1.5 block text-xs text-zinc-500"
          >
            Ім&apos;я
          </label>
          <Input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше ім'я"
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="client-phone"
            className="mb-1.5 block text-xs text-zinc-500"
          >
            Телефон
          </label>
          <Input
            id="client-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+380..."
            autoComplete="tel"
          />
        </div>

        {!profile?.has_profile && (
          <p className="text-xs text-zinc-500">
            Після першого запису до майстра ви зможете зберегти профіль тут.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Профіль збережено
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving || !profile?.has_profile}
        >
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Збереження...
            </>
          ) : (
            "Зберегти"
          )}
        </Button>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Зовнішній вигляд
        </p>
        <ThemeToggle />
      </Card>
    </div>
  );
}
