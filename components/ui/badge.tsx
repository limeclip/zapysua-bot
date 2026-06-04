import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        secondary:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        outline:
          "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
        success:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
        warning:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
        danger:
          "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
        muted: "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
