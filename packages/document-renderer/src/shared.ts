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

/** Only http(s) links are allowed as hrefs; missing schemes default to https. */
export function sanitizeHref(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? withScheme
      : null;
  } catch {
    return null;
  }
}

/** The header contact line: phone/email/city as plain text, links as clickable labels. */
export function renderContactLine(
  scalarValues: string[],
  links: Array<{ label: string; url: string }>,
) {
  const parts = [
    ...scalarValues.filter((value) => value.length > 0).map((value) => escapeHtml(value)),
    ...links
      .map((link) => ({ label: link.label.trim(), url: sanitizeHref(link.url) }))
      .filter((link): link is { label: string; url: string } => Boolean(link.label && link.url))
      .map((link) => `<a href="${escapeAttribute(link.url)}">${escapeHtml(link.label)}</a>`),
  ];

  return parts.join(" · ");
}
