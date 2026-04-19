import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva("cvforge-button", {
  defaultVariants: {
    size: "md",
    variant: "primary",
  },
  variants: {
    variant: {
      primary: "cvforge-button--primary",
      secondary: "cvforge-button--secondary",
      ghost: "cvforge-button--ghost",
    },
    size: {
      sm: "cvforge-button--sm",
      md: "cvforge-button--md",
      lg: "cvforge-button--lg",
    },
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ size, variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
