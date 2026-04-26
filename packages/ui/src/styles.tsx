import React from "react";

export const paperStylesCss = `
  :root {
    color-scheme: light;
  }

  /* ─── Shell layout ─────────────────────────────── */

  .cvforge-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(circle at top, rgba(200, 169, 110, 0.14), transparent 28rem),
      linear-gradient(180deg, var(--paper-canvas) 0%, #f6f3ed 100%);
    color: var(--paper-text);
    font-family: var(--paper-font-body);
  }

  .cvforge-shell__body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .cvforge-shell__main {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: var(--paper-space-xl);
    padding: var(--paper-space-xl);
    align-content: start;
  }

  /* ─── Top bar ───────────────────────────────────── */

  .cvforge-shell__topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paper-space-md);
    height: 56px;
    padding: 0 var(--paper-space-xl);
    border-bottom: 1px solid var(--paper-border);
    background: color-mix(in srgb, var(--paper-canvas) 92%, rgba(255, 255, 255, 0.5));
    backdrop-filter: blur(12px);
  }

  .cvforge-shell__topbar-left {
    display: flex;
    align-items: center;
    gap: var(--paper-space-md);
    min-width: 0;
  }

  .cvforge-shell__topbar-right {
    display: flex;
    align-items: center;
    gap: var(--paper-space-md);
    flex-shrink: 0;
  }

  .cvforge-shell__topbar-brand {
    display: none;
  }

  .cvforge-shell__topbar-accessory {
    display: flex;
    align-items: center;
  }

  /* ─── Avatar ─────────────────────────────────────── */

  .cvforge-shell__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--paper-accent);
    color: var(--paper-surface);
    font-family: var(--paper-font-mono);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    flex-shrink: 0;
    cursor: default;
    user-select: none;
  }

  /* ─── Breadcrumb ────────────────────────────────── */

  .cvforge-shell__breadcrumb {
    min-width: 0;
  }

  .cvforge-shell__breadcrumb-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    align-items: center;
    gap: var(--paper-space-sm);
  }

  .cvforge-shell__breadcrumb-item {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--paper-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ─── Desktop sidebar ───────────────────────────── */

  .cvforge-shell__sidebar {
    display: none;
  }

  .cvforge-shell__sidebar-brand {
    padding: var(--paper-space-xl) var(--paper-space-xl) var(--paper-space-md);
  }

  .cvforge-shell__sidebar-nav {
    padding: 0 var(--paper-space-md) var(--paper-space-xl);
  }

  .cvforge-shell__sidebar-nav-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--paper-space-xs);
  }

  /* ─── Nav links (shared sidebar + drawer) ────────── */

  .cvforge-shell__nav-link {
    display: grid;
    gap: 0.2rem;
    padding: 0.6rem var(--paper-space-md);
    border: 1px solid transparent;
    border-radius: var(--paper-radius-md);
    background: transparent;
    color: inherit;
    text-decoration: none;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .cvforge-shell__nav-link:hover {
    background: color-mix(in srgb, var(--paper-surface) 85%, transparent);
    border-color: var(--paper-border);
  }

  .cvforge-shell__nav-link:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--paper-accent-soft) 75%, white);
    outline-offset: 2px;
  }

  .cvforge-shell__nav-link[aria-current="page"] {
    border-color: color-mix(in srgb, var(--paper-accent-soft) 55%, var(--paper-border));
    background: color-mix(in srgb, var(--paper-accent-soft) 14%, white);
  }

  .cvforge-shell__nav-label {
    font-family: var(--paper-font-document);
    font-size: 0.98rem;
    color: var(--paper-text);
    font-weight: 500;
  }

  .cvforge-shell__nav-description {
    color: var(--paper-text-muted);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  /* ─── Eyebrow badge ──────────────────────────────── */

  .cvforge-shell__eyebrow {
    width: fit-content;
    padding: var(--paper-space-sm) var(--paper-space-lg);
    border-radius: var(--paper-radius-pill);
    border: 1px solid var(--paper-border);
    background: var(--paper-surface-muted);
    color: var(--paper-accent);
    font-family: var(--paper-font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  /* ─── Hamburger ──────────────────────────────────── */

  .cvforge-shell__hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 8px;
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-md);
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
  }

  .cvforge-shell__hamburger:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--paper-accent-soft) 75%, white);
    outline-offset: 2px;
  }

  .cvforge-shell__hamburger-bar {
    display: block;
    width: 18px;
    height: 2px;
    background: var(--paper-text);
    border-radius: 2px;
  }

  /* ─── Mobile drawer ──────────────────────────────── */

  .cvforge-shell__topbar-mobile-controls {
    display: flex;
    align-items: center;
  }

  .cvforge-shell__drawer-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
  }

  .cvforge-shell__drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 50;
    width: min(80vw, 300px);
    display: flex;
    flex-direction: column;
    background: var(--paper-canvas);
    border-right: 1px solid var(--paper-border);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
    animation: drawerSlideIn 200ms ease;
  }

  @keyframes drawerSlideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  .cvforge-shell__drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--paper-space-md) var(--paper-space-xl);
    border-bottom: 1px solid var(--paper-border);
    height: 56px;
    flex-shrink: 0;
  }

  .cvforge-shell__drawer-title {
    font-family: var(--paper-font-document);
    font-size: 1rem;
    font-weight: 600;
    color: var(--paper-text);
  }

  .cvforge-shell__drawer-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-md);
    background: transparent;
    color: var(--paper-text-muted);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .cvforge-shell__drawer-close:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--paper-accent-soft) 75%, white);
    outline-offset: 2px;
  }

  .cvforge-shell__drawer-nav-list {
    margin: 0;
    padding: var(--paper-space-md);
    list-style: none;
    overflow-y: auto;
    flex: 1;
    display: grid;
    gap: var(--paper-space-xs);
    align-content: start;
  }

  /* ─── Page header ───────────────────────────────── */

  .cvforge-shell__page-header {
    display: grid;
    gap: var(--paper-space-sm);
    padding-bottom: var(--paper-space-md);
    border-bottom: 1px solid var(--paper-border);
  }

  .cvforge-shell__page-title {
    margin: 0;
    font-family: var(--paper-font-document);
    font-size: clamp(1.35rem, 3vw, 1.75rem);
    font-weight: 700;
    color: var(--paper-text);
    line-height: 1.2;
  }

  .cvforge-shell__page-description {
    margin: 0;
    color: var(--paper-text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* ─── Legacy helpers (keep for page content) ─────── */

  .cvforge-shell__grid {
    display: grid;
    gap: var(--paper-space-lg);
  }

  .cvforge-shell__form {
    display: grid;
    gap: var(--paper-space-lg);
    min-width: 0;
  }

  .cvforge-shell__field {
    display: grid;
    gap: var(--paper-space-sm);
    min-width: 0;
  }

  .cvforge-shell__list {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--paper-text-muted);
    line-height: 1.65;
  }

  .cvforge-shell__list li + li {
    margin-top: var(--paper-space-sm);
  }

  .cvforge-shell__meta {
    color: var(--paper-text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .cvforge-shell__actions,
  .cvforge-shell__stack {
    display: flex;
    flex-wrap: wrap;
    gap: var(--paper-space-md);
  }

  .cvforge-card {
    display: grid;
    gap: var(--paper-space-lg);
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-lg);
    background: color-mix(in srgb, var(--paper-surface) 88%, transparent);
    box-shadow: var(--paper-shadow-paper);
  }

  .cvforge-card__header,
  .cvforge-card__content,
  .cvforge-card__footer {
    display: grid;
    gap: var(--paper-space-sm);
    padding-inline: var(--paper-space-xl);
  }

  .cvforge-card__header {
    padding-top: var(--paper-space-xl);
  }

  .cvforge-card__content {
    padding-bottom: var(--paper-space-xl);
    min-width: 0;
  }

  .cvforge-card__footer {
    padding-bottom: var(--paper-space-xl);
    padding-top: 0;
    align-items: center;
  }

  .cvforge-card__title {
    margin: 0;
    font-family: var(--paper-font-document);
    font-size: 1.35rem;
    line-height: 1.2;
    color: var(--paper-text);
  }

  .cvforge-card__description {
    margin: 0;
    color: var(--paper-text-muted);
    line-height: 1.65;
  }

  .cvforge-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--paper-space-sm);
    border-radius: var(--paper-radius-pill);
    border: 1px solid transparent;
    font-family: var(--paper-font-body);
    font-weight: 600;
    letter-spacing: 0.01em;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      transform 150ms ease,
      box-shadow 150ms ease;
    cursor: pointer;
    text-decoration: none;
  }

  .cvforge-button:focus-visible,
  .cvforge-input:focus-visible,
  .cvforge-textarea:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--paper-accent-soft) 75%, white);
    outline-offset: 2px;
  }

  .cvforge-button:hover {
    transform: translateY(-1px);
  }

  .cvforge-button:disabled,
  .cvforge-input:disabled,
  .cvforge-textarea:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .cvforge-button--primary {
    background: var(--paper-accent);
    color: var(--paper-surface);
    box-shadow: var(--paper-shadow-paper);
  }

  .cvforge-button--primary:hover {
    background: color-mix(in srgb, var(--paper-accent) 92%, white);
  }

  .cvforge-button--secondary {
    background: var(--paper-surface);
    color: var(--paper-accent);
    border-color: var(--paper-border);
  }

  .cvforge-button--secondary:hover,
  .cvforge-button--ghost:hover {
    background: var(--paper-surface-muted);
  }

  .cvforge-button--ghost {
    background: transparent;
    color: var(--paper-accent);
    border-color: color-mix(in srgb, var(--paper-border) 78%, transparent);
  }

  .cvforge-button--sm {
    min-height: 2.5rem;
    padding: 0.625rem 1rem;
    font-size: 0.92rem;
  }

  .cvforge-button--md {
    min-height: 2.875rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.98rem;
  }

  .cvforge-button--lg {
    min-height: 3.125rem;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }

  .cvforge-badge {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    border-radius: var(--paper-radius-pill);
    border: 1px solid transparent;
    padding: 0.35rem 0.75rem;
    font-family: var(--paper-font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cvforge-badge--accent {
    background: color-mix(in srgb, var(--paper-accent-soft) 18%, white);
    border-color: color-mix(in srgb, var(--paper-accent-soft) 45%, white);
    color: var(--paper-accent);
  }

  .cvforge-badge--success {
    background: color-mix(in srgb, var(--paper-success) 15%, white);
    border-color: color-mix(in srgb, var(--paper-success) 30%, white);
    color: var(--paper-success);
  }

  .cvforge-badge--outline {
    background: transparent;
    border-color: var(--paper-border);
    color: var(--paper-text-muted);
  }

  .cvforge-label {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--paper-text);
  }

  .cvforge-input,
  .cvforge-textarea {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-md);
    background: color-mix(in srgb, var(--paper-surface) 92%, transparent);
    box-shadow: var(--paper-shadow-line);
    color: var(--paper-text);
    font: inherit;
  }

  .cvforge-input {
    min-height: 3rem;
    padding: 0.75rem 0.95rem;
  }

  .cvforge-textarea {
    min-height: 8.5rem;
    padding: 0.9rem 0.95rem;
    resize: vertical;
  }

  .cvforge-input::placeholder,
  .cvforge-textarea::placeholder {
    color: color-mix(in srgb, var(--paper-text-muted) 82%, white);
  }

  .cvforge-cv-editor__desktop-only {
    display: none;
  }

  .cvforge-cv-editor__mobile-only {
    display: grid;
    gap: var(--paper-space-lg);
  }

  .cvforge-cv-editor__split {
    display: grid;
    gap: var(--paper-space-lg);
  }

  /* ≥768px: hide hamburger, show topbar brand */
  @media (min-width: 768px) {
    .cvforge-shell__topbar-mobile-controls {
      display: none;
    }

    .cvforge-shell__topbar-brand {
      display: inline-flex;
    }

    .cvforge-shell__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cvforge-shell__grid > .cvforge-card:first-child {
      grid-column: span 2;
    }
  }

  /* ≥1024px: fixed 240px sidebar, no drawer */
  @media (min-width: 1024px) {
    .cvforge-shell__topbar-mobile-controls {
      display: none;
    }

    .cvforge-shell__topbar-brand {
      display: inline-flex;
    }

    .cvforge-cv-editor__desktop-only {
      display: grid;
    }

    .cvforge-cv-editor__mobile-only {
      display: none;
    }

    .cvforge-cv-editor__split {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      align-items: start;
    }

    .cvforge-shell__sidebar {
      display: flex;
      flex-direction: column;
      width: 240px;
      flex-shrink: 0;
      min-height: calc(100vh - 56px);
      position: sticky;
      top: 56px;
      align-self: flex-start;
      height: calc(100vh - 56px);
      overflow-y: auto;
      border-right: 1px solid var(--paper-border);
      background: color-mix(in srgb, var(--paper-surface) 92%, transparent);
    }
  }
`;

export function PaperStyles() {
  return <style>{paperStylesCss}</style>;
}
