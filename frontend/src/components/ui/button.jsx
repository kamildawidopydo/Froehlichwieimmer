import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-tight transition-all duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-signature/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // shadcn defaults — preserved for backwards compatibility
        default:
          "bg-primary text-primary-foreground shadow-editorial-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",

        // Editorial premium variants
        primary:
          "shine bg-bank-signature text-white shadow-editorial-md hover:bg-bank-signature-hover hover:-translate-y-px",
        "ghost-dark":
          "border border-white/22 bg-transparent text-white hover:border-white/55 hover:bg-white/[0.04]",
        "outline-accent":
          "border border-bank-accent-strong/55 bg-transparent text-bank-accent-strong hover:bg-bank-accent/12 hover:border-bank-accent-strong dark:text-bank-accent dark:hover:bg-bank-accent/10 dark:hover:border-bank-accent",
        "outline-ink":
          "border border-bank-border bg-white text-bank-text hover:border-bank-signature/45 hover:bg-bank-signature/[0.06] hover:text-bank-signature dark:border-bank-border dark:bg-bank-surface-elev dark:text-bank-text dark:hover:border-bank-signature/50 dark:hover:bg-bank-signature/10 dark:hover:text-bank-signature",
        "ghost-ink":
          "text-bank-text hover:bg-bank-signature/[0.08] hover:text-bank-signature",

        // Session 80.26 — subtle multi-color outline variants (icons/tags/rare CTAs)
        "outline-petrol":
          "border border-bank-petrol-border bg-white text-bank-petrol-ink hover:border-bank-petrol hover:bg-bank-petrol-tint",
        "outline-coral":
          "border border-bank-coral-border bg-white text-bank-coral-ink hover:border-bank-coral hover:bg-bank-coral-tint",
        "outline-violet":
          "border border-bank-violet-border bg-white text-bank-violet-ink hover:border-bank-violet hover:bg-bank-violet-tint",
        "outline-amber":
          "border border-bank-amber-border bg-white text-bank-amber-ink hover:border-bank-amber hover:bg-bank-amber-tint",
        "outline-info":
          "border border-bank-info-border bg-white text-bank-info-ink hover:border-bank-info hover:bg-bank-info-tint",
        "outline-rose":
          "border border-bank-rose-border bg-white text-bank-rose-ink hover:border-bank-rose hover:bg-bank-rose-tint",
        // Session 80.42 — Gold + Sage outline variants (no solid gold CTA by design).
        "outline-gold":
          "border border-bank-gold-border bg-white text-bank-gold-ink hover:border-bank-gold hover:bg-bank-gold-tint",
        "outline-sage":
          "border border-bank-sage-border bg-white text-bank-sage-ink hover:border-bank-sage hover:bg-bank-sage-tint",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3.5 text-xs",
        lg: "h-12 rounded-lg px-7 text-[13px] font-semibold tracking-[0.02em]",
        xl: "h-14 rounded-lg px-9 text-[13px] font-semibold uppercase tracking-[0.18em]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
