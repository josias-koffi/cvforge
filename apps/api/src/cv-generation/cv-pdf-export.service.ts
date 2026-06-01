import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ApplicationsStore, StoredApplication } from "../applications/applications.types";
import { renderCvDocx, renderLetterDocx } from "./cv-docx-templates";
import { renderCvPdfHtml, renderLetterPdfHtml } from "./cv-html-templates";

type PdfExportConfig = {
  puppeteerUrl: string;
};

export type PdfExportResult = {
  filename: string;
  pdf: Buffer;
};

export type DocxExportResult = {
  docx: Buffer;
  filename: string;
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

function sanitizeFilenameSegment(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

function buildDocxFilename(application: StoredApplication) {
  return buildPdfFilename(application).replace(/\.pdf$/i, ".docx");
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

function buildLetterDocxFilename(application: StoredApplication) {
  return buildLetterPdfFilename(application).replace(/\.pdf$/i, ".docx");
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

async function postPdf(html: string, puppeteerUrl: string) {
  return fetch(`${puppeteerUrl}/pdf`, {
    body: JSON.stringify({
      html,
      options: {
        displayHeaderFooter: false,
        format: "A4",
        margin: {
          bottom: "10mm",
          left: "10mm",
          right: "10mm",
          top: "10mm",
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

async function callPuppeteer(html: string): Promise<Buffer> {
  const { puppeteerUrl } = resolvePdfExportConfig();
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

  return Buffer.from(await response.arrayBuffer());
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

    return {
      filename: buildPdfFilename(application),
      pdf: await callPuppeteer(renderCvPdfHtml(application.cvContent)),
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

    return {
      filename: buildLetterPdfFilename(application),
      pdf: await callPuppeteer(renderLetterPdfHtml(application.letterContent)),
    };
  }

  async exportDocx(
    userEmail: string,
    applicationId: string,
  ): Promise<DocxExportResult> {
    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    if (!application.cvContent) {
      throw new NotFoundException("Aucun CV genere pour cette candidature.");
    }

    return {
      docx: await renderCvDocx(application.cvContent),
      filename: buildDocxFilename(application),
    };
  }

  async exportLetterDocx(
    userEmail: string,
    applicationId: string,
  ): Promise<DocxExportResult> {
    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    if (!application.letterContent) {
      throw new NotFoundException("Aucune lettre generee pour cette candidature.");
    }

    return {
      docx: await renderLetterDocx(application.letterContent),
      filename: buildLetterDocxFilename(application),
    };
  }
}
