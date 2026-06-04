"use client";

import { MiniAppPageShell } from "@/components/MiniAppPageShell";

export default function CustomerDetailPage() {
  return (
    <MiniAppPageShell title="Клієнт">
      {() => (
        <p className="py-8 text-center text-sm text-zinc-500">
          Сторінка клієнта буде доступна в наступному оновленні
        </p>
      )}
    </MiniAppPageShell>
  );
}
