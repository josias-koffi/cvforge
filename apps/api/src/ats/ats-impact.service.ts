import type { AtsLlmSignals, AtsOfferContext } from "@cvforge/ats-score";
import { Injectable } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import { pseudonymizeCvText } from "../cv-generation/cv-pseudonymizer";
import {
  ATS_IMPACT_RESPONSE_FORMAT,
  ATS_IMPACT_SYSTEM_PROMPT,
} from "./ats.prompts";

/**
 * Four integers and a dozen short strings. The schema caps every free-text
 * field, which matters more than the token budget: the interview report used to
 * fail outright when a long answer was cut mid-string and `JSON.parse` threw.
 */
const IMPACT_MAX_TOKENS = 700;
/** Providers that honour `response_format`; without it the schema is advisory. */
const IMPACT_PROVIDER = { require_parameters: true } as const;
/** Enough of a CV to judge how it is written, and a bound on what we send out. */
const MAX_TEXT_CHARS = 12_000;

type RawSignals = Partial<Record<keyof AtsLlmSignals, unknown>>;

/**
 * The model's contribution to the ATS score: four bounded sub-scores on the
 * `impact` dimension alone, plus the written advice.
 *
 * It never returns the overall score — the arithmetic belongs to the engine, so
 * changing model cannot shift everyone's score at once. And it never throws:
 * scoring is free and must never be the reason a CV generation or a public scan
 * fails, so every failure path returns null and the caller falls back to rules.
 */
@Injectable()
export class AtsImpactService {
  constructor(private readonly openRouterService: OpenRouterService) {}

  async assess(
    cvText: string,
    offer?: AtsOfferContext | null,
  ): Promise<AtsLlmSignals | null> {
    // Belt and braces: callers are expected to pass pseudonymised text, but this
    // is the last point before the data leaves the building.
    const { text } = pseudonymizeCvText(cvText.slice(0, MAX_TEXT_CHARS));

    try {
      const raw = await this.openRouterService.chat(
        [
          { role: "system", content: ATS_IMPACT_SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(text, offer) },
        ],
        {
          maxTokens: IMPACT_MAX_TOKENS,
          provider: IMPACT_PROVIDER,
          responseFormat: ATS_IMPACT_RESPONSE_FORMAT,
          // Zero, not 0.2: the same CV must not drift between two scans, since
          // the score is persisted and charted across versions.
          temperature: 0,
        },
      );

      return parseSignals(raw);
    } catch {
      // A provider outage costs the written advice, never the score.
      return null;
    }
  }
}

function buildUserMessage(text: string, offer?: AtsOfferContext | null) {
  return JSON.stringify({
    // Absent rather than empty: an empty offer would invite the model to judge
    // relevance against nothing and invent a target role.
    ...(offer
      ? {
          offer: {
            requirements: offer.requirements,
            responsibilities: offer.responsibilities,
            title: offer.title,
          },
        }
      : {}),
    pseudonymisedCvText: text,
  });
}

/**
 * Anything short of a complete, in-range answer is discarded.
 *
 * A strict schema is a request, not a guarantee — a fallback model may ignore
 * it, and a half-parsed set of sub-scores would silently distort the dimension
 * rather than obviously fail.
 */
function parseSignals(raw: string): AtsLlmSignals | null {
  let parsed: RawSignals;

  try {
    parsed = JSON.parse(raw) as RawSignals;
  } catch {
    return null;
  }

  const actionVerbs = readScore(parsed.actionVerbs);
  const consistency = readScore(parsed.consistency);
  const quantification = readScore(parsed.quantification);
  const relevance = readScore(parsed.relevance);

  if (
    actionVerbs === null ||
    consistency === null ||
    quantification === null ||
    relevance === null
  ) {
    return null;
  }

  return {
    actionVerbs,
    consistency,
    highlights: readStrings(parsed.highlights, 3),
    improvements: readStrings(parsed.improvements, 5),
    quantification,
    relevance,
  };
}

/** Out of range is rejected, not clamped: it means the schema was not honoured. */
function readScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 10) return null;

  return Math.round(value);
}

function readStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, max);
}
