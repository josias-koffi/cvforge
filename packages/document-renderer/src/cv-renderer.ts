import type { CVDocumentContent } from "@cvforge/types";
import {
  escapeAttribute,
  escapeHtml,
  SHARED_PDF_STYLES,
} from "./shared";

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

  const skillsSection = (() => {
    const categories = cvContent.skills.categories;
    if (categories && categories.length > 0) {
      return `
        <section class="section skills-section">
          <h2>Compétences clés</h2>
          ${categories
            .map(
              (cat) =>
                `<p><strong>${escapeHtml(cat.label)}</strong> : ${cat.items.map((i) => escapeHtml(i)).join(" · ")}</p>`,
            )
            .join("")}
        </section>
      `;
    }
    if (cvContent.skills.hard.length > 0) {
      return `
        <section class="section skills-section">
          <h2>Compétences</h2>
          <p class="skills-inline">${cvContent.skills.hard
            .slice(0, 12)
            .map((s) => escapeHtml(s))
            .join(" · ")}</p>
        </section>
      `;
    }
    return "";
  })();

  const sections = [
    cvContent.candidate.summary
      ? `
        <section class="section">
          <h2>Profil</h2>
          <p>${escapeHtml(cvContent.candidate.summary)}</p>
        </section>
      `
      : "",
    skillsSection,
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
                      <p class="company">${escapeHtml(experience.company)}</p>
                    </div>
                    <p class="date-range">${escapeHtml(
                      `${experience.startDate} – ${experience.endDate}`,
                    )}</p>
                  </div>
                  ${experience.description ? `<p>${escapeHtml(experience.description)}</p>` : ""}
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
                    <div>
                      <h3>${escapeHtml(education.degree)}</h3>
                      <p class="company">${escapeHtml(
                        [education.institution, education.mention]
                          .filter(Boolean)
                          .join(" · "),
                      )}</p>
                    </div>
                    <p class="date-range">${escapeHtml(education.year)}</p>
                  </div>
                  ${education.description ? `<p>${escapeHtml(education.description)}</p>` : ""}
                </article>
              `,
            )
            .join("")}
        </section>
      `
      : "",
    cvContent.interests
      ? `
        <section class="section">
          <h2>Centres d'intérêt</h2>
          <p>${escapeHtml(cvContent.interests)}</p>
        </section>
      `
      : "",
    cvContent.languages.length > 0
      ? `
        <section class="section">
          <h2>Langues</h2>
          <p>${cvContent.languages
            .map((language) =>
              escapeHtml(`${language.language} ${language.level}`),
            )
            .join(" · ")}</p>
        </section>
      `
      : "",
    cvContent.certifications.length > 0
      ? `
        <section class="section">
          <h2>Certifications</h2>
          <p>${cvContent.certifications
            .map((c) => escapeHtml(`${c.title} (${c.year}) · ${c.issuer}`))
            .join(" · ")}</p>
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
        font-size: 10pt;
        font-variant: small-caps;
        font-weight: bold;
        letter-spacing: 0.08em;
        color: #1a1a1a;
        border-bottom: 1px solid #d0cdc8;
        padding-bottom: 0.15rem;
        margin-top: 5pt;
        margin-bottom: 0.2rem;
      }

      h3 {
        font-size: 10pt;
        font-weight: bold;
        line-height: 1.1;
      }

      h4 {
        font-size: 9.5pt;
        font-weight: bold;
        margin-bottom: 0.1rem;
      }

      .company {
        font-size: 9.5pt;
        font-style: italic;
        color: #1a1a1a;
      }

      .date-range {
        font-size: 9pt;
        color: #6b6860;
        white-space: nowrap;
      }

      .section {
        display: grid;
        gap: 0.25rem;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .item {
        display: grid;
        gap: 0.1rem;
        margin-bottom: 4pt;
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

      li {
        font-size: 9.5pt;
        line-height: 1.1;
      }

      li + li {
        margin-top: 0.05rem;
      }

      .skills-inline {
        font-size: 9.5pt;
        line-height: 1.4;
      }

      .skills-section {
        border-top: 1px solid #d0cdc8;
        padding-top: 0.2rem;
      }

      .skills-section p {
        font-size: 9.5pt;
        line-height: 1.35;
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
            ${[
              candidate.phone,
              candidate.email,
              candidate.city,
              candidate.linkedin,
              candidate.github,
            ]
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
