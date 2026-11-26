import type { ButtonHTMLAttributes, ReactNode } from "react";

/** A titled section of the side panel. */
export function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-input bg-card hover:bg-muted",
};

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <button
      type={type}
      className={`rounded-md px-3 py-2 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/** A labelled text input. */
export function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
        {...rest}
      />
    </div>
  );
}
