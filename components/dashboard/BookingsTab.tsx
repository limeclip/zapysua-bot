import { Card } from "@/components/ui/card";

export function BookingsTab() {
  return (
    <Card className="animate-in fade-in">
      <div className="py-8 text-center">
        <div className="mb-3 text-4xl">📅</div>
        <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
          Записи
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Тут з&apos;явиться календар записів клієнтів. Незабаром!
        </p>
      </div>
    </Card>
  );
}
