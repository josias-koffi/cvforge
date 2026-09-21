import type { Locale } from "@cvforge/types";
import type { AgendaState, InterviewPhase } from "./interview.agenda";

/**
 * What the interviewer is told about where it is, each turn.
 *
 * The system prompt is rebuilt on every call anyway, and `VoiceTurnRequest`
 * accepts nothing but a system prompt, a history and audio — so this is the
 * only channel there is for steering a turn.
 */
interface PhaseCopy {
  /** Shown as the phase name, so it has to read like a recruiter's note. */
  name: string;
  goal: string;
}

const PHASE_COPY: Record<Locale, Record<InterviewPhase, PhaseCopy>> = {
  en: {
    warmup: {
      goal: "Put the candidate at ease and let them introduce themselves. Keep the introduction to two or three minutes, then move on.",
      name: "welcome",
    },
    background: {
      goal: "Walk through their career history: roles, length, why they left. Ask for specifics on what they actually did.",
      name: "career history",
    },
    motivation: {
      goal: "Find out what genuinely draws them to this role and this company, rather than any role.",
      name: "motivation",
    },
    skills: {
      goal: "Probe the skills the offer asks for. Ask for one concrete past situation in STAR form: the situation, their task, what they did, what came of it.",
      name: "competencies",
    },
    company_fit: {
      goal: "Talk about the company and the role, and test the fit: where their way of working matches, and where it does not.",
      name: "company and role fit",
    },
    expectations: {
      goal: "Cover the practical ground: salary expectations, notice period, availability, location.",
      name: "practical matters",
    },
    candidate_questions: {
      goal: "Invite their questions and answer them plainly.",
      name: "the candidate's questions",
    },
    closing: {
      goal: "Thank them, say what happens next, and close.",
      name: "closing",
    },
  },
  fr: {
    warmup: {
      goal: "Mets le candidat a l'aise et laisse-le se presenter. Limite la presentation a deux ou trois minutes, puis enchaine.",
      name: "accueil",
    },
    background: {
      goal: "Parcours le CV: postes, durees, raisons des departs. Demande du concret sur ce qu'il a reellement fait.",
      name: "parcours",
    },
    motivation: {
      goal: "Cherche ce qui l'attire vraiment dans ce poste et cette entreprise, plutot que dans n'importe quel poste.",
      name: "motivation",
    },
    skills: {
      goal: "Creuse les competences exigees par l'offre. Demande une situation vecue en STAR: la situation, sa tache, ce qu'il a fait, le resultat.",
      name: "competences",
    },
    company_fit: {
      goal: "Parle de l'entreprise et du poste, et teste l'adequation: ce qui colle avec sa facon de travailler, et ce qui colle moins.",
      name: "entreprise et adequation au poste",
    },
    expectations: {
      goal: "Aborde le concret: pretentions salariales, preavis, disponibilite, localisation.",
      name: "aspects pratiques",
    },
    candidate_questions: {
      goal: "Invite ses questions et reponds-y franchement.",
      name: "questions du candidat",
    },
    closing: {
      goal: "Remercie-le, annonce les prochaines etapes et conclus.",
      name: "conclusion",
    },
  },
};

const CLOSING_DIRECTIVE: Record<Locale, string> = {
  en: "The time is nearly up. Thank the candidate, tell them what happens next, and close in one or two sentences. Do not ask another question.",
  fr: "Le temps est presque ecoule. Remercie le candidat, annonce les prochaines etapes et conclus en une ou deux phrases. Ne pose pas de nouvelle question.",
};

function minutes(ms: number) {
  return Math.max(1, Math.round(ms / 60_000));
}

/**
 * Where we are, what to do here, and when to move on.
 *
 * Deliberately says not to recite the plan: a candidate hearing "we are now
 * in the competencies phase" is talking to a form, not a recruiter.
 */
export function buildAgendaDirective(
  state: AgendaState,
  language: Locale,
): string {
  const locale = language === "en" ? "en" : "fr";
  const copy = PHASE_COPY[locale][state.current];

  if (state.shouldWrapUp) return CLOSING_DIRECTIVE[locale];

  const nextPhase = state.next ? PHASE_COPY[locale][state.next].name : null;

  return locale === "en"
    ? [
        `Current phase: ${copy.name}. Goal: ${copy.goal}`,
        `About ${minutes(state.remainingInPhaseMs)} min left on this phase, and ${minutes(state.remainingMs)} min of interview.`,
        nextPhase
          ? `Stay on this phase until it is covered, then move on to: ${nextPhase}.`
          : "Stay on this phase until it is covered.",
        "Never recite the plan out loud.",
      ].join(" ")
    : [
        `Phase actuelle: ${copy.name}. Objectif: ${copy.goal}`,
        `Il reste environ ${minutes(state.remainingInPhaseMs)} min sur cette phase et ${minutes(state.remainingMs)} min d'entretien.`,
        nextPhase
          ? `Reste sur cette phase tant qu'elle n'est pas couverte, puis enchaine sur: ${nextPhase}.`
          : "Reste sur cette phase tant qu'elle n'est pas couverte.",
        "Ne recapitule jamais le plan a voix haute.",
      ].join(" ");
}
