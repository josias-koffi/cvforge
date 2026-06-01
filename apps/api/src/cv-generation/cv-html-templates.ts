import type { CVDocumentContent, LetterDocumentContent } from "@cvforge/types";
import { SHARED_PDF_STYLES } from "./cv-pdf-styles";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function renderList(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

export function renderCvPdfHtml(cvContent: CVDocumentContent) {
  const candidate = cvContent.candidate;

  const sections = [
    cvContent.candidate.summary
      ? `
        <section class="section">
          <h2>Profil</h2>
          <p>${escapeHtml(cvContent.candidate.summary)}</p>
        </section>
      `
      : "",
    cvContent.experiences.length > 0
      ? `
        <section class="section">
          <h2>Expériences</h2>
          ${cvContent.experiences
            .map(
              (experience) => `
                <article class="item">
                  <div class="item__header">
                    <div>
                      <h3>${escapeHtml(experience.position)}</h3>
                      <p class="muted">${escapeHtml(experience.company)}</p>
                    </div>
                    <p class="muted">${escapeHtml(
                      `${experience.startDate} - ${experience.endDate}`,
                    )}</p>
                  </div>
                  <p>${escapeHtml(experience.description)}</p>
                  ${renderList(experience.achievements)}
                </article>
              `,
            )
            .join("")}
        </section>
      `
      : "",
    cvContent.education.length > 0
      ? `
        <section class="section">
          <h2>Formation</h2>
          ${cvContent.education
            .map(
              (education) => `
                <article class="item">
                  <div class="item__header">
                    <h3>${escapeHtml(education.degree)}</h3>
                    <p class="muted">${escapeHtml(education.year)}</p>
                  </div>
                  <p>${escapeHtml(
                    education.mention
                      ? `${education.institution} · ${education.mention}`
                      : education.institution,
                  )}</p>
                </article>
              `,
            )
            .join("")}
        </section>
      `
      : "",
    cvContent.skills.hard.length > 0 || cvContent.skills.soft.length > 0
      ? `
        <section class="section">
          <h2>Compétences</h2>
          ${
            cvContent.skills.hard.length > 0
              ? `<p><strong>Hard skills :</strong> ${escapeHtml(
                  cvContent.skills.hard.join(", "),
                )}</p>`
              : ""
          }
          ${
            cvContent.skills.soft.length > 0
              ? `<p><strong>Soft skills :</strong> ${escapeHtml(
                  cvContent.skills.soft.join(", "),
                )}</p>`
              : ""
          }
        </section>
      `
      : "",
    cvContent.languages.length > 0
      ? `
        <section class="section">
          <h2>Langues</h2>
          ${cvContent.languages
            .map(
              (language) =>
                `<p>${escapeHtml(language.language)} · ${escapeHtml(language.level)}</p>`,
            )
            .join("")}
        </section>
      `
      : "",
    cvContent.certifications.length > 0
      ? `
        <section class="section">
          <h2>Certifications</h2>
          ${cvContent.certifications
            .map(
              (certification) =>
                `<p><strong>${escapeHtml(certification.title)}</strong> · ${escapeHtml(certification.issuer)} · ${escapeHtml(certification.year)}</p>`,
            )
            .join("")}
        </section>
      `
      : "",
    cvContent.projects.length > 0
      ? `
        <section class="section">
          <h2>Projets</h2>
          ${cvContent.projects
            .map(
              (project) => `
                <article class="item">
                  <h3>${escapeHtml(project.title)}</h3>
                  <p>${escapeHtml(project.description)}</p>
                  ${
                    project.url
                      ? `<p class="muted">${escapeAttribute(project.url)}</p>`
                      : ""
                  }
                </article>
              `,
            )
            .join("")}
        </section>
      `
      : "",
  ]
    .filter((section) => section.length > 0)
    .join("");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CVforge CV export</title>
    <style>
      ${SHARED_PDF_STYLES}

      main {
        display: grid;
        gap: 0.5rem;
      }

      .sheet {
        display: grid;
        gap: 0.5rem;
      }

      h2 {
        font-size: 9.5pt;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #1a1a18;
        border-bottom: 1px solid #1a1a18;
        padding-bottom: 0.15rem;
        margin-bottom: 0.3rem;
      }

      h3 {
        font-size: 11pt;
        line-height: 1.15;
      }

      .section {
        display: grid;
        gap: 0.25rem;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .item {
        display: grid;
        gap: 0.2rem;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .item__header {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        align-items: baseline;
      }

      ul {
        margin: 0;
        padding-left: 1.1rem;
      }

      li + li {
        margin-top: 0.1rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="sheet">
        <header class="hero">
          <h1>${escapeHtml(`${candidate.firstName} ${candidate.lastName}`.trim())}</h1>
          <p class="title">${escapeHtml(candidate.title)}</p>
          <p class="contact">
            ${[candidate.phone, candidate.email, candidate.city, candidate.linkedin, candidate.github]
              .filter((value) => value.length > 0)
              .map((value) => escapeHtml(value))
              .join(" · ")}
          </p>
        </header>
        ${sections}
      </section>
    </main>
  </body>
</html>`;
}

export function renderLetterPdfHtml(letterContent: LetterDocumentContent) {
  const candidate = letterContent.candidate;
  const contactLine = [candidate.phone, candidate.email, candidate.city, candidate.linkedin, candidate.github]
    .filter((value) => value.length > 0)
    .map((value) => escapeHtml(value))
    .join(" · ");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CVforge Letter export</title>
    <style>
      ${SHARED_PDF_STYLES}

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

      .company-name {
        font-weight: bold;
      }

      .company-secondary {
        color: #6b6860;
      }

      .letter-date {
        text-align: right;
        margin-top: -0.8rem;
      }

      .body {
        display: grid;
        gap: 1rem;
        line-height: 1.5;
        text-align: justify;
      }

      .letter-signature {
        font-weight: bold;
        margin-top: 1rem;
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
        <div>
          <p class="company-name">${escapeHtml(letterContent.company.name)}</p>
          <p class="company-secondary">${escapeHtml(letterContent.company.city)}</p>
        </div>
        <p class="letter-date">${escapeHtml(letterContent.date)}</p>
        <p><strong>Objet :</strong> ${escapeHtml(letterContent.object)}</p>
        <div class="body">
          <p>${escapeHtml(letterContent.body.paragraph1)}</p>
          <p>${escapeHtml(letterContent.body.paragraph2)}</p>
          <p>${escapeHtml(letterContent.body.paragraph3)}</p>
        </div>
        <p class="letter-signature">${escapeHtml(`${letterContent.signature.firstName} ${letterContent.signature.lastName}`.trim())}</p>
      </section>
    </main>
  </body>
</html>`;
}
