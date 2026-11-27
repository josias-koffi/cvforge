import { answerFromData, sameQuestion } from "../domain/fill";
import {
  asSource,
  cleanDraft,
  draftMessages,
  isFactualQuestion,
  MAX_DRAFTS,
  type DraftedAnswer,
  type DraftSources,
} from "../domain/open-answer";
import type { QuestionState } from "./fill-questions";
import type { ModelRelay, ModelRoute } from "./model-relay";
import type { JobSparkTools } from "./session";

/** What one fill remembers of the open answers it drafted. */
export type DraftState = QuestionState & {
  applicationId: string;
  route: ModelRoute;
  /** The model name page-agent uses on this route. */
  model: string;
  drafted: DraftedAnswer[];
  /** Letter, CV and offer, loaded at the first open question only. */
  sources?: Promise<DraftSources>;
};

const LEAVE_EMPTY = "Laisse ce champ vide et passe au suivant.";
const ASK_INSTEAD =
  "Question factuelle : ne la rédige pas, demande-la au candidat avec ask_user (laisse vide s'il ne répond pas).";
const FACTUAL_UNATTENDED =
  "Question factuelle et candidat absent : laisse ce champ vide, il le complétera.";
/** Short answer: page-agent's relay caps the output anyway. */
const DRAFT_MAX_TOKENS = 600;

const typeThis = (question: string, answer: string) =>
  `Tape exactement ce texte dans le champ « ${question} », sans rien changer :\n${answer}`;

/**
 * « draft_answer » (US-208): the in-page agent's open question, answered
 * from the candidate's data when it can be, else drafted from the letter,
 * the CV and the offer through the fill's own model route (no extra credit).
 * Facts the candidate alone knows (salary, dates) are never drafted.
 */
export async function draftAnswer(
  state: DraftState,
  question: string,
  deps: { tools: JobSparkTools; models: ModelRelay },
): Promise<string> {
  const known = answerFromData(
    question,
    state.data.profile,
    state.data.answers,
  );
  if (known) return typeThis(question, known);
  if (isFactualQuestion(question)) {
    return state.unattended ? FACTUAL_UNATTENDED : ASK_INSTEAD;
  }
  const earlier = state.drafted.find((entry) =>
    sameQuestion(entry.question, question, { strict: true }),
  );
  if (earlier) return typeThis(question, earlier.answer);
  if (state.drafted.length >= MAX_DRAFTS) return LEAVE_EMPTY;

  state.sources ??= loadSources(state, deps.tools);
  let answer: string | null = null;
  try {
    const reply = await deps.models.call(state.route, {
      body: JSON.stringify({
        max_tokens: DRAFT_MAX_TOKENS,
        messages: draftMessages(question, await state.sources),
        model: state.model,
      }),
      url: `${state.route.baseURL}/chat/completions`,
    });
    const { body, status } = reply as { body?: string; status?: number };
    if (body !== undefined && status !== undefined && status < 300) {
      const parsed = JSON.parse(body) as {
        choices?: { message?: { content?: string | null } }[];
      };
      answer = cleanDraft(parsed.choices?.[0]?.message?.content);
    }
  } catch {
    answer = null;
  }
  if (!answer) return state.unattended ? LEAVE_EMPTY : ASK_INSTEAD;
  state.drafted.push({ answer, question });
  return typeThis(question, answer);
}

async function loadSources(
  state: DraftState,
  tools: JobSparkTools,
): Promise<DraftSources> {
  const read = (name: string) =>
    tools.call(name, { applicationId: state.applicationId }).catch(() => null);
  const [letter, cv, application] = await Promise.all([
    read("get_cover_letter"),
    read("get_cv"),
    read("get_application"),
  ]);
  return {
    cv: asSource(cv),
    earlier: state.data.answers.custom,
    letter: asSource(letter),
    offer: asSource((application as { offer?: unknown } | null)?.offer),
  };
}
