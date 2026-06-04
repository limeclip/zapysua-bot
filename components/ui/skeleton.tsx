import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[10px] bg-zinc-200/80 dark:bg-zinc-800",
        className,
      )}
    />
  );
}
