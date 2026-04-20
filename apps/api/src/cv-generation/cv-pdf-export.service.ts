import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { CVDocumentContent, LetterDocumentContent } from "@cvforge/types";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";

type PdfExportConfig = {
  puppeteerUrl: string;
};

export type PdfExportResult = {
  filename: string;
  pdf: Buffer;
};

type BrowserlessPdfResponse = {
  html?: string;
  options?: {
    displayHeaderFooter?: boolean;
    format?: string;
    margin?: {
      bottom?: string;
      left?: string;
      right?: string;
      top?: string;
    };
    preferCSSPageSize?: boolean;
    printBackground?: boolean;
  };
  url?: string;
};

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

function sanitizeFilenameSegment(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return normalized || "Inconnu";
}

function buildPdfFilename(application: StoredApplication) {
  const candidate = application.cvContent?.candidate;
  const lastName = sanitizeFilenameSegment(
    candidate?.lastName?.trim() || "Candidat",
  ).toUpperCase();
  const firstName = sanitizeFilenameSegment(
    candidate?.firstName?.trim() || "Candidat",
  );
  const contractType = sanitizeFilenameSegment(
    application.extracted.contractType?.trim() || "Contrat",
  );
  const position = sanitizeFilenameSegment(
    application.extracted.title?.trim() || candidate?.title?.trim() || "Poste",
  );

  return `${lastName}_${firstName}_${contractType}_${position}.pdf`;
}

function buildLetterPdfFilename(application: StoredApplication) {
  const candidate = application.letterContent?.candidate;
  const lastName = sanitizeFilenameSegment(
    candidate?.lastName?.trim() || "Candidat",
  ).toUpperCase();
  const firstName = sanitizeFilenameSegment(
    candidate?.firstName?.trim() || "Candidat",
  );
  const contractType = sanitizeFilenameSegment(
    application.extracted.contractType?.trim() || "Contrat",
  );
  const position = sanitizeFilenameSegment(
    application.extracted.title?.trim() || candidate?.title?.trim() || "Poste",
  );

  return `${lastName}_${firstName}_${contractType}_${position}_LM.pdf`;
}

function resolvePdfExportConfig(
  env: NodeJS.ProcessEnv = process.env,
): PdfExportConfig {
  const puppeteerUrl = env.PUPPETEER_URL?.trim();

  if (!puppeteerUrl) {
    throw new ServiceUnavailableException(
      "Le service Puppeteer n'est pas configure.",
    );
  }

  return {
    puppeteerUrl: puppeteerUrl.replace(/\/+$/, ""),
  };
}

function renderList(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function renderCvPdfHtml(cvContent: CVDocumentContent) {
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
      @page {
        size: A4;
        margin: 12mm;
      }

      :root {
        color-scheme: light;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #f6f3ed;
        color: #1a1a18;
        font-family: "EB Garamond", "Libre Baskerville", Georgia, serif;
        font-size: 11.5pt;
        line-height: 1.5;
      }

      body {
        padding: 0;
      }

      main {
        display: grid;
        gap: 0.9rem;
      }

      .sheet {
        display: grid;
        gap: 1rem;
      }

      .hero {
        display: grid;
        gap: 0.45rem;
        padding-bottom: 0.65rem;
        border-bottom: 1px solid #c8a96e;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        font-size: 20pt;
        line-height: 1.05;
        letter-spacing: -0.03em;
      }

      h2 {
        font-size: 10pt;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.45rem;
      }

      h3 {
        font-size: 12pt;
        line-height: 1.15;
      }

      .muted {
        color: #6b6860;
      }

      .contact {
        color: #6b6860;
      }

      .section {
        display: grid;
        gap: 0.4rem;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .item {
        display: grid;
        gap: 0.4rem;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .item__header {
        display: flex;
        justify-content: space-between;
        gap: 0.9rem;
        align-items: baseline;
      }

      ul {
        margin: 0;
        padding-left: 1.1rem;
      }

      li + li {
        margin-top: 0.15rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="sheet">
        <header class="hero">
          <h1>${escapeHtml(`${candidate.firstName} ${candidate.lastName}`.trim())}</h1>
          <p class="contact">${escapeHtml(candidate.title)}</p>
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

function renderLetterPdfHtml(letterContent: LetterDocumentContent) {
  const candidate = letterContent.candidate;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CVforge Letter export</title>
    <style>
      @page {
        size: A4;
        margin: 12mm;
      }

      :root {
        color-scheme: light;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #f6f3ed;
        color: #1a1a18;
        font-family: "EB Garamond", "Libre Baskerville", Georgia, serif;
        font-size: 11.5pt;
        line-height: 1.6;
      }

      body {
        padding: 0;
      }

      main {
        display: grid;
      }

      .sheet {
        display: grid;
        gap: 1rem;
      }

      .hero {
        display: grid;
        gap: 0.45rem;
        padding-bottom: 0.65rem;
        border-bottom: 1px solid #c8a96e;
      }

      .company {
        color: #6b6860;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 20pt;
        line-height: 1.05;
        letter-spacing: -0.03em;
      }

      h2 {
        font-size: 11pt;
      }

      .contact {
        color: #6b6860;
      }

      .body {
        display: grid;
        gap: 0.9rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="sheet">
        <header class="hero">
          <div>
            <h1>${escapeHtml(`${candidate.firstName} ${candidate.lastName}`.trim())}</h1>
            <p class="contact">${escapeHtml(candidate.title)}</p>
            <p class="contact">
              ${[candidate.phone, candidate.email, candidate.city, candidate.linkedin, candidate.github]
                .filter((value) => value.length > 0)
                .map((value) => escapeHtml(value))
                .join(" · ")}
            </p>
          </div>
          <div class="company">
            <p>${escapeHtml(letterContent.company.name)}</p>
            <p>${escapeHtml(letterContent.company.city)}</p>
            <p>${escapeHtml(letterContent.date)}</p>
          </div>
          <p><strong>Objet :</strong> ${escapeHtml(letterContent.object)}</p>
        </header>
        <section class="body">
          <p>${escapeHtml(letterContent.body.paragraph1)}</p>
          <p>${escapeHtml(letterContent.body.paragraph2)}</p>
          <p>${escapeHtml(letterContent.body.paragraph3)}</p>
        </section>
        <p>${escapeHtml(`${letterContent.signature.firstName} ${letterContent.signature.lastName}`.trim())}</p>
      </section>
    </main>
  </body>
</html>`;
}

async function postPdf(html: string, puppeteerUrl: string) {
  return fetch(`${puppeteerUrl}/pdf`, {
    body: JSON.stringify({
      html,
      options: {
        displayHeaderFooter: false,
        format: "A4",
        margin: {
          bottom: "12mm",
          left: "12mm",
          right: "12mm",
          top: "12mm",
        },
        preferCSSPageSize: true,
        printBackground: true,
      },
    } satisfies BrowserlessPdfResponse),
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

@Injectable()
export class CvPdfExportService {
  constructor(private readonly store: ApplicationsStore) {}

  async exportPdf(
    userEmail: string,
    applicationId: string,
  ): Promise<PdfExportResult> {
    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    if (!application.cvContent) {
      throw new NotFoundException("Aucun CV genere pour cette candidature.");
    }

    const { puppeteerUrl } = resolvePdfExportConfig();
    const html = renderCvPdfHtml(application.cvContent);
    let response: Response;

    try {
      response = await postPdf(html, puppeteerUrl);
    } catch (error) {
      throw new ServiceUnavailableException(
        "Le service Puppeteer est inaccessible.",
        { cause: error as Error },
      );
    }

    if (!response.ok) {
      const fallback = await response.text().catch(() => "");
      throw new BadGatewayException(
        fallback
          ? `L'export PDF a echoue: ${fallback.slice(0, 200)}`
          : "L'export PDF a echoue.",
      );
    }

    return {
      filename: buildPdfFilename(application),
      pdf: Buffer.from(await response.arrayBuffer()),
    };
  }

  async exportLetterPdf(
    userEmail: string,
    applicationId: string,
  ): Promise<PdfExportResult> {
    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    if (!application.letterContent) {
      throw new NotFoundException("Aucune lettre generee pour cette candidature.");
    }

    const { puppeteerUrl } = resolvePdfExportConfig();
    const html = renderLetterPdfHtml(application.letterContent);
    let response: Response;

    try {
      response = await postPdf(html, puppeteerUrl);
    } catch (error) {
      throw new ServiceUnavailableException(
        "Le service Puppeteer est inaccessible.",
        { cause: error as Error },
      );
    }

    if (!response.ok) {
      const fallback = await response.text().catch(() => "");
      throw new BadGatewayException(
        fallback
          ? `L'export PDF a echoue: ${fallback.slice(0, 200)}`
          : "L'export PDF a echoue.",
      );
    }

    return {
      filename: buildLetterPdfFilename(application),
      pdf: Buffer.from(await response.arrayBuffer()),
    };
  }
}
