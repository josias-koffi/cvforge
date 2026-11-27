import { screeningQuestionKey } from "@cvforge/types";
import {
  answerFromData,
  sameQuestion,
  type FillAnswers,
  type FillProfile,
} from "../domain/fill";
import type { CandidateChannel } from "./filling";
import type { JobSparkTools } from "./session";

/** What one fill remembers of the questions put to the candidate. */
export type QuestionState = {
  /** What the agent may be told without asking the candidate. */
  data: { profile: FillProfile; answers: FillAnswers };
  questionsAsked: number;
  answersSaved: number;
  /** Each question goes to the candidate once; the agent tends to re-ask. */
  asked: Map<string, string | null>;
  /** A queued fill (US-204): nobody is asked, unknown fields stay empty. */
  unattended: boolean;
};

const ALREADY_ASKED =
  "Déjà demandé au candidat, sans réponse : laisse ce champ vide, ne repose pas la question et passe au suivant.";
const TOO_MANY_QUESTIONS =
  "Plus de question au candidat pour ce formulaire : laisse les champs restants vides et termine.";
const UNATTENDED =
  "Le candidat n'est pas là pour répondre : laisse ce champ vide et passe au suivant.";
/** Beyond this, the candidate is not bothered again during this fill. */
const MAX_QUESTIONS = 8;

/**
 * The agent's question about a field: answered from the candidate's data
 * when it can be, else put to the candidate once (ADR-034 §5), never made up.
 */
export async function askCandidate(
  state: QuestionState,
  question: string,
  deps: { candidate: CandidateChannel; tools: JobSparkTools },
): Promise<string | null> {
  const known = answerFromData(
    question,
    state.data.profile,
    state.data.answers,
  );
  if (known) return known;
  if (state.unattended) return UNATTENDED;
  const key = screeningQuestionKey(question);
  const earlier = [...state.asked.keys()].find(
    (asked) => asked === key || sameQuestion(asked, key),
  );
  if (earlier !== undefined) return state.asked.get(earlier) ?? ALREADY_ASKED;
  if (state.questionsAsked >= MAX_QUESTIONS) return TOO_MANY_QUESTIONS;
  state.questionsAsked += 1;
  const { answer, save } = await deps.candidate.ask(question);
  state.asked.set(key, answer);
  if (answer && save) {
    try {
      await deps.tools.call("save_screening_answer", { answer, question });
      state.answersSaved += 1;
    } catch {
      // Not fatal: the form still gets the answer. An older connection may
      // lack answers:write until the candidate reconnects.
    }
  }
  return answer;
}
