import { cn } from "@/lib/utils";

export function ProgressBar({
  step,
  total,
  className,
}: {
  step: number;
  total: number;
  className?: string;
}) {
  const percent = Math.round((step / total) * 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          Крок {step} з {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-500 ease-out dark:bg-zinc-100"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
