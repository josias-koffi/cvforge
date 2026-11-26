import { BadRequestException } from "@nestjs/common";
import {
  SCREENING_ANSWER_KEYS,
  SCREENING_ANSWER_MAX_LENGTH,
  SCREENING_CUSTOM_MAX,
  SCREENING_QUESTION_MAX_LENGTH,
  isScreeningAnswerKey,
  screeningQuestionKey,
  type CustomScreeningAnswer,
  type ScreeningAnswerKey,
  type ScreeningAnswers,
} from "@cvforge/types";
import { eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { screeningAnswers } from "../database/schema";

/** DI token for the screening answers store. */
export const SCREENING_ANSWERS_STORE = Symbol("SCREENING_ANSWERS_STORE");

export type ScreeningAnswersStore = {
  find(userEmail: string): Promise<ScreeningAnswers | null>;
  save(userEmail: string, answers: ScreeningAnswers): Promise<void>;
};

export class PgScreeningAnswersStore implements ScreeningAnswersStore {
  constructor(private readonly db: Database) {}

  async find(userEmail: string) {
    const [row] = await this.db
      .select()
      .from(screeningAnswers)
      .where(eq(screeningAnswers.userEmail, userEmail));

    return row
      ? {
          custom: row.custom,
          known: row.known,
          updatedAt: row.updatedAt.toISOString(),
        }
      : null;
  }

  async save(userEmail: string, answers: ScreeningAnswers) {
    const values = {
      custom: answers.custom,
      known: answers.known,
      updatedAt: new Date(answers.updatedAt ?? Date.now()),
    };
    await this.db
      .insert(screeningAnswers)
      .values({ ...values, userEmail })
      .onConflictDoUpdate({ set: values, target: screeningAnswers.userEmail });
  }
}

const EMPTY: ScreeningAnswers = { custom: [], known: {}, updatedAt: null };

function text(value: unknown, max: number, what: string): string {
  if (typeof value !== "string") {
    throw new BadRequestException(`${what} : texte attendu.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new BadRequestException(`${what} : ${max} caractères au plus.`);
  }
  return trimmed;
}

/**
 * The candidate's answers to recruiters' screening questions (ADR-034 §5).
 * Written by the candidate, in the app or from the extension's prompt; read
 * by the extension. An empty answer removes the entry.
 */
export class ScreeningAnswersService {
  constructor(
    private readonly store: ScreeningAnswersStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(userEmail: string): Promise<ScreeningAnswers> {
    return (await this.store.find(userEmail)) ?? EMPTY;
  }

  /** Replaces everything (the profile screen's form). */
  async replace(userEmail: string, body: unknown): Promise<ScreeningAnswers> {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Réponses attendues.");
    }
    const { known, custom } = body as { known?: unknown; custom?: unknown };
    const answers: ScreeningAnswers = {
      custom: this.readCustomList(custom),
      known: this.readKnown(known),
      updatedAt: this.now().toISOString(),
    };
    await this.store.save(userEmail, answers);
    return answers;
  }

  /**
   * One answer, from the extension when the candidate answered a question a
   * form asked: a known key, or a question kept word for word.
   */
  async saveOne(
    userEmail: string,
    input: { key?: unknown; question?: unknown; answer: unknown },
  ): Promise<ScreeningAnswers> {
    const current = await this.get(userEmail);
    const answer = text(input.answer, SCREENING_ANSWER_MAX_LENGTH, "Réponse");
    const updatedAt = this.now().toISOString();

    if (input.key !== undefined) {
      if (!isScreeningAnswerKey(input.key)) {
        throw new BadRequestException("Type de question inconnu.");
      }
      const known = { ...current.known, [input.key]: answer };
      if (!answer) delete known[input.key];
      return this.persist(userEmail, { ...current, known, updatedAt });
    }

    const question = text(
      input.question,
      SCREENING_QUESTION_MAX_LENGTH,
      "Question",
    );
    if (!question) throw new BadRequestException("Question vide.");
    const key = screeningQuestionKey(question);
    const others = current.custom.filter(
      (entry) => screeningQuestionKey(entry.question) !== key,
    );
    const custom = answer
      ? [{ answer, question, updatedAt }, ...others]
      : others;
    if (custom.length > SCREENING_CUSTOM_MAX) {
      throw new BadRequestException(
        `${SCREENING_CUSTOM_MAX} réponses enregistrées au plus.`,
      );
    }
    return this.persist(userEmail, { ...current, custom, updatedAt });
  }

  private async persist(userEmail: string, answers: ScreeningAnswers) {
    await this.store.save(userEmail, answers);
    return answers;
  }

  private readKnown(value: unknown): ScreeningAnswers["known"] {
    if (value === undefined) return {};
    if (!value || typeof value !== "object") {
      throw new BadRequestException("Réponses types : objet attendu.");
    }
    const known: Partial<Record<ScreeningAnswerKey, string>> = {};
    for (const key of SCREENING_ANSWER_KEYS) {
      const raw = (value as Record<string, unknown>)[key];
      if (raw === undefined || raw === null) continue;
      const answer = text(raw, SCREENING_ANSWER_MAX_LENGTH, key);
      if (answer) known[key] = answer;
    }
    return known;
  }

  private readCustomList(value: unknown): CustomScreeningAnswer[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > SCREENING_CUSTOM_MAX) {
      throw new BadRequestException(
        `${SCREENING_CUSTOM_MAX} réponses enregistrées au plus.`,
      );
    }
    const seen = new Set<string>();
    const now = this.now().toISOString();
    return value.flatMap((entry: unknown) => {
      const { question, answer, updatedAt } = (entry ?? {}) as Record<
        string,
        unknown
      >;
      const q = text(question, SCREENING_QUESTION_MAX_LENGTH, "Question");
      const a = text(answer, SCREENING_ANSWER_MAX_LENGTH, "Réponse");
      const key = screeningQuestionKey(q);
      if (!q || !a || seen.has(key)) return [];
      seen.add(key);
      return [
        {
          answer: a,
          question: q,
          updatedAt: typeof updatedAt === "string" ? updatedAt : now,
        },
      ];
    });
  }
}
