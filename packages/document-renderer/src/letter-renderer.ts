import type { LetterDocumentContent } from "@cvforge/types";
import { escapeHtml, SHARED_PDF_STYLES } from "./shared";

export function renderLetterPdfHtml(letterContent: LetterDocumentContent) {
  const candidate = letterContent.candidate;
  const contactLine = [
    candidate.phone,
    candidate.email,
    candidate.city,
    candidate.linkedin,
    candidate.github,
  ]
    .filter((value) => value.length > 0)
    .map((value) => escapeHtml(value))
    .join(" · ");

  const placeDate = [candidate.city, letterContent.date]
    .filter((value) => value.length > 0)
    .join(", le ");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CVforge Letter export</title>
    <style>
      ${SHARED_PDF_STYLES}

      @page {
        size: A4;
        margin: 20mm 25mm;
      }

      body {
        --preview-margin-block: 6.734%;
        --preview-margin-inline: 11.905%;
      }

      main {
        display: grid;
      }

      .sheet {
        display: grid;
        gap: 1.4rem;
      }

      .contact-program {
        color: #6b6860;
        font-style: italic;
      }

      .letter-meta,
      .company-block {
        display: grid;
      }

      .letter-meta {
        gap: 0.6rem;
      }

      .company-block {
        gap: 0.1rem;
      }

      .company-name,
      .letter-signature {
        font-weight: bold;
      }

      .company-secondary,
      .letter-place-date {
        color: #6b6860;
      }

      .letter-date {
        text-align: right;
      }

      .body {
        display: grid;
        gap: 1rem;
        line-height: 1.5;
        text-align: justify;
      }

      .letter-place-date {
        margin-top: 1rem;
      }

      .letter-signature {
        margin-top: 0.25rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="sheet">
        <header class="hero">
          <h1>${escapeHtml(`${candidate.firstName} ${candidate.lastName}`.trim())}</h1>
          <p class="contact">${contactLine}</p>
          ${candidate.title ? `<p class="contact-program">${escapeHtml(candidate.title)}</p>` : ""}
        </header>
        <div class="letter-meta">
          <div class="company-block">
            <p class="company-name">${escapeHtml(letterContent.company.name)}</p>
            <p class="company-secondary">${escapeHtml(letterContent.company.city)}</p>
          </div>
          <p class="letter-date">${escapeHtml(letterContent.date)}</p>
          <p><strong>Objet :</strong> ${escapeHtml(letterContent.object)}</p>
        </div>
        <div class="body">
          <p>${escapeHtml(letterContent.body.paragraph1)}</p>
          <p>${escapeHtml(letterContent.body.paragraph2)}</p>
          <p>${escapeHtml(letterContent.body.paragraph3)}</p>
          ${letterContent.body.paragraph4 ? `<p>${escapeHtml(letterContent.body.paragraph4)}</p>` : ""}
        </div>
        ${placeDate ? `<p class="letter-place-date">${escapeHtml(placeDate)}</p>` : ""}
        <p class="letter-signature">${escapeHtml(`${letterContent.signature.firstName} ${letterContent.signature.lastName}`.trim())}</p>
      </section>
    </main>
  </body>
</html>`;
}
