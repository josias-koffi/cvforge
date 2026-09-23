import type { RomeAppellationOption } from "@cvforge/types";
import type { FtHttpClient } from "../france-travail/ft-http.client";

/** One appellation ROMEO proposes for a text, with its confidence. */
export interface RomeoPrediction extends RomeAppellationOption {
  score: number;
  /** Which of the texts sent it answers: earlier texts weigh more. */
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

/** ROMEO refuses a call without a caller name (400 J072000G). */
const CALLER_NAME = "cvforge";
const RESULTS_PER_TEXT = 5;
/** Beyond a handful of job titles, the extra ones only repeat the first. */
const MAX_TEXTS = 10;
const MAX_TEXT_CHARS = 200;

/**
 * ROMEO v2, France Travail's model that reads a free text as ROME jobs.
 *
 * Called when a search project is saved, never on a page view (ADR-024), and
 * all the candidate's titles go in a single call.
 */
export class RomeoClient {
  constructor(private readonly franceTravail: FtHttpClient) {}

  /**
   * Every prediction for the texts, or `null` when ROMEO could not answer —
   * disabled, unsubscribed, down. A caller treats `null` as "no suggestion",
   * never as a failure of what it was doing.
   */
  async predict(texts: readonly string[]): Promise<RomeoPrediction[] | null> {
    const intitules = [
      ...new Set(texts.map((text) => text.trim().slice(0, MAX_TEXT_CHARS))),
    ]
      .filter(Boolean)
      .slice(0, MAX_TEXTS);

    if (intitules.length === 0) return [];
    if (!this.franceTravail.isEnabled("romeo")) return null;

    const result = await this.franceTravail.request<RomeoAnswer[]>("romeo", {
      body: {
        appellations: intitules.map((intitule, index) => ({
          identifiant: String(index),
          intitule,
        })),
        options: { nbResultats: RESULTS_PER_TEXT, nomAppelant: CALLER_NAME },
      },
      method: "POST",
      path: "/predictionMetiers",
    });

    if (result.kind !== "ok" || !Array.isArray(result.data)) return null;

    return result.data.flatMap((answer, textIndex) =>
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
    );
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
