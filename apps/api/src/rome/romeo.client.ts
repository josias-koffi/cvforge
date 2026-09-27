import type {
  ProfileRomeCompetence,
  RomeAppellationOption,
} from "@cvforge/types";
import type { FtHttpClient } from "../france-travail/ft-http.client";

/** One appellation ROMEO proposes for a text, with its confidence. */
export interface RomeoPrediction extends RomeAppellationOption {
  score: number;
  /** Which of the texts sent it answers: earlier texts weigh more. */
  textIndex: number;
}

/** One competence ROMEO reads in a text of the CV. */
export interface RomeoCompetence extends ProfileRomeCompetence {
  textIndex: number;
}

/** Shape read live on 2026-09-23: one entry per text sent. */
interface RomeoAnswer {
  metiersRome?: Array<{
    codeAppellation?: string;
    libelleAppellation?: string;
    codeRome?: string;
    libelleRome?: string;
    scorePrediction?: number;
  }>;
}

/** Shape read live on 2026-09-24, `predictionCompetences`. */
interface RomeoCompetenceAnswer {
  competencesRome?: Array<{
    codeCompetence?: string;
    libelleCompetence?: string;
    typeCompetence?: string;
    scorePrediction?: number;
  }>;
}

/** ROMEO refuses a call without a caller name (400 J072000G). */
const CALLER_NAME = "cvforge";
const MAX_TEXT_CHARS = 200;

const JOBS = {
  /** Beyond a handful of job titles, the extra ones only repeat the first. */
  maxTexts: 10,
  resultsPerText: 5,
};

/**
 * One text per skill or result line of a CV. Sixty texts in one call answered
 * fine live (2026-09-24); past three answers per text, the rest is noise.
 */
const COMPETENCES = { maxTexts: 60, resultsPerText: 3 };

/**
 * ROMEO v2, France Travail's model that reads a free text as ROME jobs or
 * ROME competences.
 *
 * Called when a search project or a profile is saved, never on a page view
 * (ADR-024), and all the texts of one save go in a single call.
 */
export class RomeoClient {
  constructor(private readonly franceTravail: FtHttpClient) {}

  /**
   * Every prediction for the texts, or `null` when ROMEO could not answer —
   * disabled, unsubscribed, down. A caller treats `null` as "no suggestion",
   * never as a failure of what it was doing.
   */
  async predict(texts: readonly string[]): Promise<RomeoPrediction[] | null> {
    const answers = await this.ask<RomeoAnswer>(
      "/predictionMetiers",
      "appellations",
      texts,
      JOBS,
    );

    return (
      answers?.flatMap((answer, textIndex) =>
        (answer.metiersRome ?? []).flatMap((entry) =>
          entry.codeAppellation && entry.libelleAppellation && entry.codeRome
            ? [
                {
                  code: entry.codeAppellation,
                  libelle: entry.libelleAppellation,
                  metierCode: entry.codeRome,
                  metierLibelle: entry.libelleRome ?? "",
                  score: entry.scorePrediction ?? 0,
                  textIndex,
                },
              ]
            : [],
        ),
      ) ?? null
    );
  }

  /** The ROME competences in each text, with the same `null` contract. */
  async predictCompetences(
    texts: readonly string[],
  ): Promise<RomeoCompetence[] | null> {
    const answers = await this.ask<RomeoCompetenceAnswer>(
      "/predictionCompetences",
      "competences",
      texts,
      COMPETENCES,
    );

    return (
      answers?.flatMap((answer, textIndex) =>
        (answer.competencesRome ?? []).flatMap((entry) =>
          entry.codeCompetence && entry.libelleCompetence
            ? [
                {
                  code: entry.codeCompetence,
                  libelle: entry.libelleCompetence,
                  score: entry.scorePrediction ?? 0,
                  textIndex,
                  type: entry.typeCompetence ?? "",
                },
              ]
            : [],
        ),
      ) ?? null
    );
  }

  /**
   * Both predictions take the same body: distinct trimmed texts, each with an
   * identifier, and the caller name. Answers come back in the order sent.
   */
  private async ask<Answer>(
    path: string,
    field: "appellations" | "competences",
    texts: readonly string[],
    limits: { maxTexts: number; resultsPerText: number },
  ): Promise<Answer[] | null> {
    const intitules = [
      ...new Set(texts.map((text) => text.trim().slice(0, MAX_TEXT_CHARS))),
    ]
      .filter(Boolean)
      .slice(0, limits.maxTexts);

    if (intitules.length === 0) return [];
    if (!this.franceTravail.isEnabled("romeo")) return null;

    const result = await this.franceTravail.request<Answer[]>("romeo", {
      body: {
        [field]: intitules.map((intitule, index) => ({
          identifiant: String(index),
          intitule,
        })),
        options: {
          nbResultats: limits.resultsPerText,
          nomAppelant: CALLER_NAME,
        },
      },
      method: "POST",
      path,
    });

    return result.kind === "ok" && Array.isArray(result.data)
      ? result.data
      : null;
  }
}

/**
 * The appellations to show, taken in turns: the best answer to each text,
 * then the second best of each, and so on, earlier texts first.
 *
 * Ranking on the score alone let one text take every place — measured live on
 * 2026-09-23, a CV headline "Boulangère pâtissière" pushed out both job titles
 * the candidate had typed. Each title the candidate wrote deserves a chip.
 * Codes already decided on, and repeats, are skipped.
 */
export function bestAppellations(
  predictions: readonly RomeoPrediction[],
  excluded: ReadonlySet<string>,
  limit: number,
): RomeoPrediction[] {
  const byText = new Map<number, RomeoPrediction[]>();

  for (const prediction of predictions) {
    if (excluded.has(prediction.code)) continue;
    byText.set(prediction.textIndex, [
      ...(byText.get(prediction.textIndex) ?? []),
      prediction,
    ]);
  }

  const queues = [...byText.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, entries]) => [...entries].sort((a, b) => b.score - a.score));
  const chosen = new Map<string, RomeoPrediction>();

  while (chosen.size < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (chosen.size >= limit) break;

      let next = queue.shift();
      while (next && chosen.has(next.code)) next = queue.shift();
      if (next) chosen.set(next.code, next);
    }
  }

  return [...chosen.values()];
}
