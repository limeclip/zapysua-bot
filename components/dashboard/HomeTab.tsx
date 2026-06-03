import { Card } from "@/components/ui/card";
import type { MasterWithMeta } from "@/types";
import {  Calendar1 } from "lucide-react";

export function HomeTab({ master }: { master: MasterWithMeta }) {
  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Вітаємо, {master.business_name}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Сьогоднішні записи
        </p>
      </div>

      <Card>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-2">
          <span className="flex items-center gap-2">
            <Calendar1 className="w-5 h-5" />
            Записів на сьогодні поки немає.
          </span>
          Розділ «Записи» незабаром буде доступний.
        </p>
      </Card>

      {master.subscription?.status === "trial" && (
        <Card className="border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            🎁 Пробний період активний
            {master.subscription.trial_end_date && (
              <>
                {" "}
                до{" "}
                {new Date(
                  master.subscription.trial_end_date,
                ).toLocaleDateString("uk-UA")}
              </>
            )}
          </p>
        </Card>
      )}
    </div>
  );
}
