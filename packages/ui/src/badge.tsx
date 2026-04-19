import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva("cvforge-badge", {
  defaultVariants: {
    variant: "accent",
  },
  variants: {
    variant: {
      accent: "cvforge-badge--accent",
      success: "cvforge-badge--success",
      outline: "cvforge-badge--outline",
    },
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
