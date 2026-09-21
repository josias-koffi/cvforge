import type { CompanyContext } from "@cvforge/types";
import { Injectable, Logger } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "./applications.types";

/**
 * What the offer says about the company, beyond the role.
 *
 * Vision's "Étape 3 — enrichissement contexte entreprise" asked for sector,
 * size, culture, values and a pay range. None of it existed: the schema had no
 * field for any of it, so the culture-fit part of an interview had nothing to
 * work from.
 *
 * Derived from the offer text the account already holds, not from the open
 * web. An offer is written by the company about itself, which is exactly the
 * tone a candidate will be asked to match; scraping for news is a separate
 * question with its own privacy answer.
 */
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "company_context",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["sector", "size", "culture", "values", "salaryEstimate"],
      properties: {
        sector: { type: ["string", "null"] },
        size: { type: ["string", "null"] },
        culture: { type: ["string", "null"] },
        values: { type: "array", items: { type: "string" }, maxItems: 6 },
        salaryEstimate: { type: ["string", "null"] },
      },
    },
  },
} as const;

/** Without it, a provider ignoring the schema answers with prose. */
const PROVIDER = { require_parameters: true } as const;

const SYSTEM_PROMPT = [
  "You extract what a job offer says about the hiring company itself.",
  "Use only what the offer states or clearly implies; never invent a fact.",
  "Any field you cannot ground in the text must be null, and values an empty array.",
  "Answer in the language of the offer, in short noun phrases.",
].join(" ");

/** A long offer says nothing more about the company than its first pages. */
const MAX_OFFER_CHARS = 6000;

@Injectable()
export class CompanyContextService {
  constructor(
    private readonly openRouter: OpenRouterService,
    private readonly store: ApplicationsStore,
  ) {}

  private readonly logger = new Logger(CompanyContextService.name);

  /**
   * Derives the context once and caches it on the application.
   *
   * Lazy, on the first interview that wants it, rather than for every
   * application created: most never lead to an interview, and charging them
   * all for a lookup nobody reads is waste.
   */
  async ensureFor(application: StoredApplication): Promise<StoredApplication> {
    if (application.companyContext) return application;

    const companyContext = await this.derive({
      companyName: application.extracted?.companyName ?? null,
      offerText: application.rawOfferText ?? "",
    });
    if (!companyContext) return application;

    const updated: StoredApplication = {
      ...application,
      companyContext,
      companyContextGeneratedAt: new Date().toISOString(),
    };
    await this.store.save(updated);

    return updated;
  }

  /**
   * Null on any failure. This feeds one section of an interview prompt: it is
   * never worth failing a session the candidate has already paid for.
   */
  async derive(input: {
    companyName: string | null;
    offerText: string;
  }): Promise<CompanyContext | null> {
    const offerText = input.offerText.trim();
    if (offerText.length === 0) return null;

    try {
      const raw = await this.openRouter.chat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              companyName: input.companyName,
              offerText: offerText.slice(0, MAX_OFFER_CHARS),
            }),
          },
        ],
        {
          maxTokens: 300,
          provider: PROVIDER,
          responseFormat: RESPONSE_FORMAT,
          temperature: 0,
        },
      );

      return normalizeCompanyContext(JSON.parse(raw));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      this.logger.warn(`Company context unavailable: ${reason}`);

      return null;
    }
  }
}

/** Anything the model got wrong in shape becomes null rather than leaking through. */
export function normalizeCompanyContext(parsed: unknown): CompanyContext | null {
  if (!parsed || typeof parsed !== "object") return null;

  const raw = parsed as Record<string, unknown>;
  const context: CompanyContext = {
    culture: text(raw.culture),
    salaryEstimate: text(raw.salaryEstimate),
    sector: text(raw.sector),
    size: text(raw.size),
    values: Array.isArray(raw.values)
      ? raw.values
          .map(text)
          .filter((value): value is string => value !== null)
          .slice(0, 6)
      : [],
  };

  // Every field empty means the offer said nothing useful; storing that would
  // only make us look it up again and again.
  const hasAnything =
    context.values.length > 0 ||
    [context.culture, context.salaryEstimate, context.sector, context.size].some(
      (value) => value !== null,
    );

  return hasAnything ? context : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
}
