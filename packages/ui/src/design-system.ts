import type { CSSProperties } from "react";

export const paperTokens = {
  color: {
    canvas: "#FAFAF7",
    surface: "#FFFFFF",
    surfaceMuted: "#F2F0EB",
    text: "#1A1A18",
    textMuted: "#6B6860",
    accent: "#2C2C2A",
    accentSoft: "#C8A96E",
    border: "#D9D3C7",
    success: "#4A7C59",
    danger: "#C0392B",
  },
  typography: {
    display: '"Playfair Display", "Times New Roman", serif',
    body: '"DM Sans", "Trebuchet MS", sans-serif',
    document: '"EB Garamond", "Georgia", serif',
    mono: '"JetBrains Mono", "SFMono-Regular", monospace',
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "3rem",
    "4xl": "4rem",
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    pill: "999px",
  },
  shadow: {
    paper: "0 18px 40px rgba(44, 44, 42, 0.08)",
    line: "0 1px 0 rgba(44, 44, 42, 0.06)",
  },
  breakpoint: {
    md: "768px",
    lg: "1024px",
  },
} as const;

export const paperThemeBodyStyle: CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  backgroundColor: paperTokens.color.canvas,
  color: paperTokens.color.text,
  fontFamily: paperTokens.typography.body,
};

export function paperTokenCssVars(): CSSProperties {
  return {
    "--paper-canvas": paperTokens.color.canvas,
    "--paper-surface": paperTokens.color.surface,
    "--paper-surface-muted": paperTokens.color.surfaceMuted,
    "--paper-text": paperTokens.color.text,
    "--paper-text-muted": paperTokens.color.textMuted,
    "--paper-accent": paperTokens.color.accent,
    "--paper-accent-soft": paperTokens.color.accentSoft,
    "--paper-border": paperTokens.color.border,
    "--paper-success": paperTokens.color.success,
    "--paper-danger": paperTokens.color.danger,
    "--paper-font-display": paperTokens.typography.display,
    "--paper-font-body": paperTokens.typography.body,
    "--paper-font-document": paperTokens.typography.document,
    "--paper-font-mono": paperTokens.typography.mono,
    "--paper-space-xs": paperTokens.spacing.xs,
    "--paper-space-sm": paperTokens.spacing.sm,
    "--paper-space-md": paperTokens.spacing.md,
    "--paper-space-lg": paperTokens.spacing.lg,
    "--paper-space-xl": paperTokens.spacing.xl,
    "--paper-space-2xl": paperTokens.spacing["2xl"],
    "--paper-space-3xl": paperTokens.spacing["3xl"],
    "--paper-space-4xl": paperTokens.spacing["4xl"],
    "--paper-radius-sm": paperTokens.radius.sm,
    "--paper-radius-md": paperTokens.radius.md,
    "--paper-radius-lg": paperTokens.radius.lg,
    "--paper-radius-pill": paperTokens.radius.pill,
    "--paper-shadow-paper": paperTokens.shadow.paper,
    "--paper-shadow-line": paperTokens.shadow.line,
  } as CSSProperties;
}
