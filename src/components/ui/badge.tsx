import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-50 text-slate-900 shadow hover:bg-slate-50/80",
        secondary:
          "border-transparent bg-paper-2 text-ink-900 hover:bg-paper-2/80",
        destructive:
          "border-transparent bg-red-500 text-ink-900 shadow hover:bg-red-500/80",
        outline: "text-ink-900 border-ink-900/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={style}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
