import {
  buildAgenda,
  countExchanges,
  elapsedSince,
  resolveAgendaState,
} from "./interview.agenda";
import { buildTurnPrompt } from "./interview.prompts";
import { selectPromptMessages, summarizeCoveredGround } from "./interview.stats";
import type { StoredInterviewSession } from "./interview.types";

function agendaStateOf(session: StoredInterviewSession) {
  const agenda = buildAgenda(session.profile, session.durationMinutes, {
    hasContext: session.context !== null,
  });

  return resolveAgendaState(agenda, {
    elapsedMs: elapsedSince(session.startedAt),
    exchanges: countExchanges(session.messages),
  });
}

/** When the recruiter is to call `end_interview` — and when not. */
const END_TOOL_INSTRUCTIONS = {
  en: "When the interview is over — you have closed it, or the candidate asks to stop — say goodbye in one sentence, then call the end_interview tool. Never call it before saying goodbye, and never while the interview still has ground to cover unless the candidate asks.",
  fr: "Quand l'entretien est termine — tu as conclu, ou le candidat demande a arreter — dis au revoir en une phrase, puis appelle l'outil end_interview. Ne l'appelle jamais avant d'avoir dit au revoir, ni tant qu'il reste des sujets a couvrir, sauf si le candidat le demande.",
} as const;

/**
 * The recruiter's brief as it stands now: who it is, the job, and where the
 * interview has got to. Recomputed after every reply, because the phase moves.
 */
export function buildSessionPrompt(session: StoredInterviewSession): string {
  const window = selectPromptMessages(session.messages);
  const dropped = session.messages.filter(
    (message) => !window.includes(message),
  );

  const locale = session.language === "en" ? "en" : "fr";

  return [
    buildTurnPrompt({
      agendaState: agendaStateOf(session),
      context: session.context,
      coveredGround: summarizeCoveredGround(dropped, locale),
      language: session.language,
      profile: session.profile,
    }),
    END_TOOL_INSTRUCTIONS[locale],
  ].join("\n\n");
}

/**
 * Whether the recruiter has nothing left to ask.
 *
 * Counted once the goodbye is recorded: an interview whose closing has been
 * delivered leaves the candidate in front of a recruiter that has already
 * left, which is its worst moment.
 */
export function isInterviewOver(session: StoredInterviewSession): boolean {
  return agendaStateOf(session).isComplete;
}
