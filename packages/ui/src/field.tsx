import React from "react";
import { cn } from "./utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return <label className={cn("cvforge-label", className)} ref={ref} {...props} />;
});

Label.displayName = "Label";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      className={cn("cvforge-input", className)}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea className={cn("cvforge-textarea", className)} ref={ref} {...props} />
  );
});

Textarea.displayName = "Textarea";
