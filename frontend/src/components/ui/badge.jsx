import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Session 80.26 — subtle editorial accent variants (soft tint + ink text + hairline border)
        navy:   "border-bank-ink/15   bg-bank-ink/[0.06]        text-bank-ink font-medium",
        petrol: "border-bank-petrol-border bg-bank-petrol-tint  text-bank-petrol-ink font-medium",
        coral:  "border-bank-coral-border  bg-bank-coral-tint   text-bank-coral-ink font-medium",
        violet: "border-bank-violet-border bg-bank-violet-tint  text-bank-violet-ink font-medium",
        amber:  "border-bank-amber-border  bg-bank-amber-tint   text-bank-amber-ink font-medium",
        info:   "border-bank-info-border   bg-bank-info-tint    text-bank-info-ink font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
