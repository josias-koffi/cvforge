import React from "react";
import { paperTokenCssVars } from "./design-system";

type AppShellProps = {
  title: string;
  description: string;
};

const shellCss = `
  .cvforge-shell {
    min-height: 100vh;
    padding: var(--paper-space-xl);
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

  .cvforge-shell__hero,
  .cvforge-shell__panel {
    background: color-mix(in srgb, var(--paper-surface) 88%, transparent);
    border: 1px solid var(--paper-border);
    border-radius: var(--paper-radius-lg);
    box-shadow: var(--paper-shadow-paper);
  }

  .cvforge-shell__hero {
    padding: var(--paper-space-2xl);
    display: grid;
    gap: var(--paper-space-lg);
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

  .cvforge-shell__title {
    margin: 0;
    font-family: var(--paper-font-display);
    font-size: clamp(2.5rem, 9vw, 4.75rem);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  .cvforge-shell__description {
    margin: 0;
    max-width: 38rem;
    color: var(--paper-text-muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .cvforge-shell__grid {
    display: grid;
    gap: var(--paper-space-lg);
  }

  .cvforge-shell__panel {
    padding: var(--paper-space-xl);
    display: grid;
    gap: var(--paper-space-md);
  }

  .cvforge-shell__panel-title {
    margin: 0;
    font-family: var(--paper-font-document);
    font-size: 1.35rem;
  }

  .cvforge-shell__panel-copy {
    margin: 0;
    color: var(--paper-text-muted);
    line-height: 1.65;
  }

  .cvforge-shell__list {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--paper-text-muted);
    line-height: 1.6;
  }

  @media (min-width: 768px) {
    .cvforge-shell {
      padding: var(--paper-space-2xl);
    }

    .cvforge-shell__grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
`;

export function AppShell({ title, description }: AppShellProps) {
  return (
    <main className="cvforge-shell" style={paperTokenCssVars()}>
      <style>{shellCss}</style>
      <section className="cvforge-shell__frame">
        <article className="cvforge-shell__hero">
          <p className="cvforge-shell__eyebrow">CVforge · Papier &amp; Crayon</p>
          <h1 className="cvforge-shell__title">{title}</h1>
          <p className="cvforge-shell__description">{description}</p>
        </article>

        <section className="cvforge-shell__grid" aria-label="Design system foundations">
          <article className="cvforge-shell__panel">
            <h2 className="cvforge-shell__panel-title">Palette papier ivoire</h2>
            <p className="cvforge-shell__panel-copy">
              Warm neutrals, charcoal ink, and a sand accent keep the interface
              aligned with the product vision.
            </p>
          </article>

          <article className="cvforge-shell__panel">
            <h2 className="cvforge-shell__panel-title">Typographies codified</h2>
            <p className="cvforge-shell__panel-copy">
              Display, body, document, and mono families are separated to keep
              UI, templates, and admin surfaces consistent.
            </p>
          </article>

          <article className="cvforge-shell__panel">
            <h2 className="cvforge-shell__panel-title">Mobile-first surfaces</h2>
            <ul className="cvforge-shell__list">
              <li>Single-column by default</li>
              <li>Three-card grid from tablet up</li>
              <li>Comfortable spacing tuned for touch</li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}
