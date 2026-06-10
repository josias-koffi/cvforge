export const SHARED_PDF_STYLES = `
  @page {
    size: A4;
    margin: 1.5cm;
  }

  :root {
    color-scheme: light;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #1a1a1a;
    font-family: "EB Garamond", "Libre Baskerville", Georgia, serif;
    font-size: 9.5pt;
    line-height: 1.05;
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  h1 {
    font-size: 18pt;
    font-weight: bold;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #1a1a1a;
  }

  .muted {
    color: #6b6860;
  }

  .contact {
    font-size: 9.5pt;
    color: #6b6860;
  }

  .title {
    font-size: 10.5pt;
    color: #1a1a1a;
  }

  .hero {
    display: grid;
    gap: 0.25rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #1a1a1a;
  }

  @media screen {
    html {
      min-height: 100%;
    }

    body {
      box-sizing: border-box;
      min-height: 100vh;
      padding: var(--preview-margin-block, 5.05%)
        var(--preview-margin-inline, 7.143%);
    }
  }
`;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value: string) {
  return escapeHtml(value);
}
