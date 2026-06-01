export const SHARED_PDF_STYLES = `
  @page {
    size: A4;
    margin: 10mm;
  }

  :root {
    color-scheme: light;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #1a1a18;
    font-family: "EB Garamond", "Libre Baskerville", Georgia, serif;
    font-size: 10.5pt;
    line-height: 1.3;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    font-size: 18pt;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .muted {
    color: #6b6860;
  }

  .contact {
    color: #6b6860;
  }

  .title {
    color: #1a1a18;
  }

  .hero {
    display: grid;
    gap: 0.3rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid #1a1a18;
  }
`;
