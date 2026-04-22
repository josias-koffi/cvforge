import React from "react";

export const paperStylesCss = `
  :root {
    color-scheme: light;
  }

  .cvforge-shell {
    min-height: 100vh;
    padding: var(--paper-space-xl);
    padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
    background:
      radial-gradient(circle at top, rgba(200, 169, 110, 0.14), transparent 28rem),
      linear-gradient(180deg, var(--paper-canvas) 0%, #f6f3ed 100%);
    color: var(--paper-text);
    font-family: var(--paper-font-body);
  }

  .cvforge-shell__frame {
    width: min(100%, 72rem);
    margin: 0 auto;
    display: grid;
    gap: var(--paper-space-xl);
  }

  .cvforge-shell__main {
    display: grid;
    gap: var(--paper-space-xl);
    min-width: 0;
  }

  .cvforge-shell__sidebar {
    display: none;
  }

  .cvforge-shell__sidebar-header {
    display: grid;
    gap: var(--paper-space-md);
  }

  .cvforge-shell__sidebar-copy {
    margin: 0;
    color: var(--paper-text-muted);
    line-height: 1.65;
  }

  .cvforge-shell__hero {
    display: grid;
    gap: var(--paper-space-lg);
    padding: var(--paper-space-2xl);
  }

  .cvforge-shell__hero-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paper-space-md);
    flex-wrap: wrap;
  }

  .cvforge-shell__hero-accessory {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

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

  .cvforge-shell__hero-copy {
    display: grid;
    gap: var(--paper-space-md);
  }

  .cvforge-shell__title {
    margin: 0;
    font-family: var(--paper-font-display);
    font-size: clamp(2.5rem, 9vw, 4.75rem);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  .cvforge-shell__description {
    margin: 0;
    max-width: 42rem;
    color: var(--paper-text-muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .cvforge-shell__actions,
  .cvforge-shell__stack {
    display: flex;
    flex-wrap: wrap;
    gap: var(--paper-space-md);
  }

  .cvforge-shell__sidebar-nav-list,
  .cvforge-shell__mobile-nav-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cvforge-shell__sidebar-nav-list {
    display: grid;
    gap: var(--paper-space-sm);
  }

  .cvforge-shell__nav-link {
    display: grid;
    gap: var(--paper-space-xs);
    padding: var(--paper-space-md) var(--paper-space-lg);
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-lg);
    background: color-mix(in srgb, var(--paper-surface) 92%, transparent);
    color: inherit;
    text-decoration: none;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .cvforge-shell__nav-link:hover {
    transform: translateY(-1px);
    background: var(--paper-surface);
  }

  .cvforge-shell__nav-link[aria-current="page"] {
    border-color: color-mix(in srgb, var(--paper-accent-soft) 55%, var(--paper-border));
    background: color-mix(in srgb, var(--paper-accent-soft) 14%, white);
  }

  .cvforge-shell__nav-label {
    font-family: var(--paper-font-document);
    font-size: 1.05rem;
    color: var(--paper-text);
  }

  .cvforge-shell__nav-description {
    color: var(--paper-text-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .cvforge-shell__mobile-nav {
    position: sticky;
    bottom: 0;
    z-index: 10;
    width: min(100%, 72rem);
    margin: 0 auto;
  }

  .cvforge-shell__mobile-nav-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--paper-space-sm);
    padding: var(--paper-space-sm);
    border: 1px solid color-mix(in srgb, var(--paper-border) 82%, white);
    border-radius: calc(var(--paper-radius-lg) + 0.25rem);
    background: color-mix(in srgb, var(--paper-surface) 90%, rgba(255, 255, 255, 0.2));
    box-shadow: var(--paper-shadow-paper);
    backdrop-filter: blur(12px);
  }

  .cvforge-shell__mobile-nav-link {
    display: grid;
    justify-items: center;
    gap: var(--paper-space-xs);
    min-height: 4rem;
    padding: var(--paper-space-sm);
    border-radius: var(--paper-radius-md);
    color: inherit;
    text-decoration: none;
  }

  .cvforge-shell__mobile-nav-link[aria-current="page"] {
    background: color-mix(in srgb, var(--paper-accent-soft) 16%, white);
  }

  .cvforge-shell__mobile-nav-kicker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    min-height: 2rem;
    padding-inline: var(--paper-space-sm);
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-pill);
    background: var(--paper-surface-muted);
    font-family: var(--paper-font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cvforge-shell__mobile-nav-label {
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
  }

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

  @media (min-width: 768px) {
    .cvforge-shell {
      padding: var(--paper-space-2xl);
      padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
    }

    .cvforge-shell__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cvforge-shell__grid > .cvforge-card:first-child {
      grid-column: span 2;
    }
  }

  @media (min-width: 1024px) {
    .cvforge-shell {
      padding-bottom: var(--paper-space-2xl);
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

    .cvforge-shell__frame {
      width: min(100%, 80rem);
      grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr);
      align-items: start;
    }

    .cvforge-shell__sidebar {
      position: sticky;
      top: var(--paper-space-2xl);
      display: grid;
      gap: var(--paper-space-lg);
      padding: var(--paper-space-xl);
      border: 1px solid var(--paper-border);
      border-radius: var(--paper-radius-lg);
      background: color-mix(in srgb, var(--paper-surface) 92%, transparent);
      box-shadow: var(--paper-shadow-paper);
    }

    .cvforge-shell__mobile-nav {
      display: none;
    }
  }
`;

export function PaperStyles() {
  return <style>{paperStylesCss}</style>;
}
