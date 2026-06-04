import { cn } from "@/lib/utils";

export const selectClassName =
  "h-12 w-full rounded-[14px] border border-zinc-200 bg-white px-4 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(selectClassName, className)} {...props} />;
}
