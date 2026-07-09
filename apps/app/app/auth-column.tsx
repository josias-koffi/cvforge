import React, { type ReactNode } from "react";
import Link from "next/link";
import { paperTokens } from "@cvforge/ui/design-system";

const AUTH_COLUMN_MAX_WIDTH = "420px";

export function AuthColumn({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        display: "grid",
        gap: paperTokens.spacing.lg,
        justifyContent: "center",
        margin: "0 auto",
        maxWidth: AUTH_COLUMN_MAX_WIDTH,
        padding: `${paperTokens.spacing["3xl"]} ${paperTokens.spacing.xl}`,
        width: "100%",
      }}
    >
      {children}
    </main>
  );
}

export function AuthEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        color: paperTokens.color.textMuted,
        fontSize: "0.875rem",
        letterSpacing: "0.08em",
        margin: 0,
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

export function AuthHeading({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        color: paperTokens.color.text,
        fontFamily: paperTokens.typography.display,
        fontSize: "2rem",
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}

export function AuthCopy({ children }: { children: ReactNode }) {
  return (
    <p style={{ color: paperTokens.color.textMuted, lineHeight: 1.6, margin: 0 }}>
      {children}
    </p>
  );
}

export function AuthErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      style={{
        backgroundColor: paperTokens.color.surfaceMuted,
        border: `1px solid ${paperTokens.color.danger}`,
        borderRadius: paperTokens.radius.md,
        color: paperTokens.color.danger,
        margin: 0,
        padding: `${paperTokens.spacing.md} ${paperTokens.spacing.lg}`,
      }}
    >
      {children}
    </p>
  );
}

export function AuthFactList({ children }: { children: ReactNode }) {
  return (
    <dl
      style={{
        backgroundColor: paperTokens.color.surface,
        border: `1px solid ${paperTokens.color.border}`,
        borderRadius: paperTokens.radius.lg,
        display: "grid",
        gap: paperTokens.spacing.sm,
        margin: 0,
        padding: paperTokens.spacing.xl,
      }}
    >
      {children}
    </dl>
  );
}

export function AuthFactTerm({ children }: { children: ReactNode }) {
  return (
    <dt style={{ color: paperTokens.color.textMuted, fontWeight: 600 }}>
      {children}
    </dt>
  );
}

export function AuthFactValue({ children }: { children: ReactNode }) {
  return <dd style={{ margin: 0 }}>{children}</dd>;
}

export function AuthConsentField({
  id,
  name,
  children,
}: {
  id: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        alignItems: "flex-start",
        display: "flex",
        gap: paperTokens.spacing.md,
        lineHeight: 1.6,
      }}
    >
      <input id={id} name={name} required type="checkbox" value="true" />
      <span>{children}</span>
    </label>
  );
}

export function AuthSubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      style={{
        backgroundColor: paperTokens.color.accent,
        border: "none",
        borderRadius: paperTokens.radius.pill,
        boxShadow: paperTokens.shadow.line,
        color: paperTokens.color.canvas,
        cursor: "pointer",
        fontFamily: paperTokens.typography.body,
        fontWeight: 600,
        padding: `${paperTokens.spacing.md} ${paperTokens.spacing.xl}`,
      }}
    >
      {children}
    </button>
  );
}

export function AuthFooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={{ color: paperTokens.color.accent }}>
      {children}
    </Link>
  );
}
