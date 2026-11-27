import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  ZapIcon,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The panel's primitives, drawn like apps/web's shadcn components (same
 * tokens, radii, shadows) without pulling the whole kit into the extension.
 */

/** The JobSpark mark, as in apps/web `Brand`. */
export function Brand() {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <span className="relative flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-surface">
        <ZapIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-spark ring-2 ring-card" />
      </span>
      <span className="text-base tracking-tight">
        Job<span className="text-primary">Spark</span>
      </span>
    </span>
  );
}

/** A titled section of the panel; `step` numbers the application flow. */
export function Card({
  title,
  step,
  children,
}: {
  title: string;
  step?: number;
  children: ReactNode;
}) {
  return (
    <section className="rise-in flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm shadow-surface">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {step !== undefined && (
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary"
          >
            {step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

const VARIANTS = {
  primary:
    "bg-primary text-primary-foreground shadow-surface hover:bg-primary/90 hover:shadow-raised",
  spark:
    "bg-spark text-spark-foreground shadow-spark hover:bg-spark/90 hover:shadow-raised",
  secondary: "border bg-card shadow-surface hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};
const SIZES = {
  default: "h-9 px-3",
  sm: "h-7 px-2.5 text-xs",
  icon: "size-8",
};

export function Button({
  variant = "primary",
  size = "default",
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ease-spark outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

const inputClass =
  "h-9 rounded-lg border border-input bg-card px-3 text-sm shadow-surface outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        {...rest}
      />
    </div>
  );
}

export function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {children}
      </select>
    </div>
  );
}

const TONES = {
  destructive: {
    box: "bg-destructive/10 text-destructive",
    icon: CircleAlertIcon,
  },
  info: { box: "bg-accent text-foreground", icon: InfoIcon },
  success: { box: "bg-success/12 text-success", icon: CircleCheckIcon },
  warning: { box: "bg-warning/12 text-warning", icon: TriangleAlertIcon },
};

/** A short message with its tone: error, warning, success or information. */
export function Notice({
  tone,
  children,
  role,
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
  role?: "alert" | "status";
}) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div
      role={role ?? (tone === "destructive" ? "alert" : undefined)}
      className={`flex gap-2 rounded-lg px-3 py-2.5 text-sm ${box}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 [&_p+p]:mt-1">{children}</div>
    </div>
  );
}

/** Small, quiet text under an action. */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
