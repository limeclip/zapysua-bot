"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { getApiHeaders } from "@/lib/api/client";
import { ImageIcon } from "lucide-react";

type LogoUploaderProps = {
  previewUrl?: string | null;
  onUploaded: (url: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
  uploadEndpoint?: string;
  responseField?: string;
  inputId?: string;
  altText?: string;
  variant?: "logo" | "avatar";
};

export function LogoUploader({
  previewUrl,
  onUploaded,
  onSkip,
  showSkip = true,
  uploadEndpoint = "/api/masters/logo",
  responseField = "logo_url",
  inputId = "logo-upload",
  altText = "Зображення",
  variant = "logo",
}: LogoUploaderProps) {
  const previewClassName =
    variant === "avatar"
      ? "mb-3 h-24 w-24 rounded-full object-cover shadow-sm ring-2 ring-zinc-100 dark:ring-zinc-800"
      : "mb-3 h-24 w-24 rounded-2xl object-cover shadow-sm";
  const placeholderClassName =
    variant === "avatar"
      ? "mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-3xl dark:bg-zinc-800"
      : "mb-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-200 text-3xl dark:bg-zinc-800";
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      try {
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);

        const formData = new FormData();
        formData.append("file", file);

        const headers = getApiHeaders() as Record<string, string>;
        delete headers["Content-Type"];

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          headers,
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Не вдалося завантажити");
        }

        const url = data[responseField] as string | undefined;
        if (!url) {
          throw new Error("Не вдалося отримати URL зображення");
        }

        onUploaded(url);
      } catch (err) {
        console.error("[LogoUploader]", err);
        setError(
          err instanceof Error ? err.message : "Помилка завантаження",
        );
        setPreview(previewUrl ?? null);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, previewUrl, uploadEndpoint, responseField],
  );

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 transition-colors dark:border-zinc-700 dark:bg-zinc-900/50",
          dragOver && "border-zinc-400 bg-zinc-100 dark:border-zinc-500",
        )}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          id={inputId}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <label htmlFor={inputId} className="flex w-full cursor-pointer flex-col items-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={altText}
              className={previewClassName}
            />
          ) : (
            <div className={placeholderClassName}>
            <ImageIcon className="size-10 text-muted-foreground" strokeWidth={0.75} />
            </div>
          )}
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {uploading
              ? "Завантаження…"
              : "Перетягніть зображення або натисніть для вибору"}
          </p>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {showSkip && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          Пропустити
        </button>
      )}
    </div>
  );
}
