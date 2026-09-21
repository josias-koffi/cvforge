import {
  INTERVIEW_PROFILE_AGGRESSIVE,
  INTERVIEW_PROFILE_BEHAVIORAL,
  INTERVIEW_PROFILE_PASSIVE,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_PROFILE_TECHNICAL,
  type InterviewMessage,
  type InterviewRecruiterProfile,
  type Locale,
} from "@cvforge/types";
import { MAX_MESSAGES } from "./interview.stats";

/**
 * Transcription no longer takes a prompt: the dedicated endpoint accepts an
 * ISO-639-1 `language` hint instead (ADR-013). Only the label survives, which
 * names the language to the interviewer model.
 */
export const LANGUAGE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "French",
};

export function resolveLanguageLabel(language: Locale) {
  return LANGUAGE_LABELS[language] ?? LANGUAGE_LABELS.fr;
}

const BASE_AI_PROMPTS: Record<Locale, string> = {
  en: [
    "You are a human-sounding mock interviewer conducting a live voice interview.",
    "Respond in English only.",
    "Reply as spoken dialogue, not as an essay.",
    "Use exactly one natural follow-up question unless one short piece of feedback is more useful.",
    "Keep it concise: one short sentence, occasionally two.",
    "Do not mention being an AI assistant.",
    "Do not use bullet points, disclaimers, or generic helper phrasing.",
  ].join(" "),
  fr: [
    "Tu es un recruteur qui mene un entretien blanc en direct.",
    "Reponds uniquement en francais.",
    "Parle comme a l'oral, pas comme une fiche de cours.",
    "Pose exactement une question de relance naturelle, sauf si une courte remarque de feedback est plus utile.",
    "Reste concis: une phrase courte, parfois deux.",
    "Ne dis jamais que tu es une IA.",
    "N'utilise ni listes, ni avertissements, ni formulations d'assistant generique.",
  ].join(" "),
};

const PROFILE_PROMPTS: Record<
  InterviewRecruiterProfile,
  Record<Locale, string>
> = {
  [INTERVIEW_PROFILE_STANDARD]: {
    en: "Adopt a balanced HR interview style: calm, professional, and neutral.",
    fr: "Adopte un style RH classique: calme, professionnel et neutre.",
  },
  [INTERVIEW_PROFILE_AGGRESSIVE]: {
    en: "Be demanding and high-pressure with sharper follow-ups, but remain realistic and never insulting.",
    fr: "Sois exigeant et met une pression realiste avec des relances plus incisives, sans jamais etre insultant.",
  },
  [INTERVIEW_PROFILE_PASSIVE]: {
    en: "Be reserved and understated, with shorter prompts, occasional silence cues, and slightly vague follow-ups.",
    fr: "Sois reserve et peu expressif, avec des relances plus courtes, parfois vagues, et des silences implicites.",
  },
  [INTERVIEW_PROFILE_TECHNICAL]: {
    en: "Focus on hard skills, architecture, tools, debugging, and concrete technical scenarios.",
    fr: "Concentre-toi sur les hard skills, l'architecture, les outils, le debug et les mises en situation techniques.",
  },
  [INTERVIEW_PROFILE_BEHAVIORAL]: {
    en: "Focus on behavioral STAR questions covering situation, task, action, and result.",
    fr: "Concentre-toi sur des questions comportementales de type STAR: situation, tache, action, resultat.",
  },
};

/** The schema the report model must fill, enforced by `response_format`. */
export const REPORT_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "interview_report",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        overallScore: { type: "integer", minimum: 0, maximum: 10 },
        summary: { type: "string" },
        improvements: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 3,
        },
        metrics: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              key: {
                type: "string",
                enum: [
                  "clarity",
                  "keywords",
                  "pacing",
                  "hesitations",
                  "relevance",
                ],
              },
              label: { type: "string" },
              score: { type: "integer", minimum: 0, maximum: 10 },
              detail: { type: "string" },
            },
            required: ["key", "label", "score", "detail"],
          },
        },
      },
      required: ["overallScore", "summary", "improvements", "metrics"],
    },
  },
} as const;

/** An unknown profile falls back to `standard` rather than throwing mid-interview. */
export function buildAiPrompt(
  language: Locale,
  profile: InterviewRecruiterProfile,
) {
  const resolvedLanguage = language === "en" ? "en" : "fr";
  const resolvedProfile =
    PROFILE_PROMPTS[profile] !== undefined ? profile : INTERVIEW_PROFILE_STANDARD;

  return [
    BASE_AI_PROMPTS[resolvedLanguage],
    PROFILE_PROMPTS[resolvedProfile][resolvedLanguage],
  ].join(" ");
}

/**
 * What the interviewer is told when nobody has spoken yet.
 *
 * A real recruiter opens the interview; leaving it to the candidate meant
 * staring at a silent microphone with no idea what was expected. This is sent
 * as the user turn of an otherwise empty conversation, so the reply that comes
 * back is the greeting itself rather than a description of one.
 */
const OPENING_INSTRUCTIONS: Record<Locale, string> = {
  en: "The interview starts now. Greet the candidate in one short sentence and ask your first question.",
  fr: "L'entretien commence. Salue le candidat en une phrase courte et pose ta premiere question.",
};

export function buildOpeningInstruction(language: Locale) {
  return OPENING_INSTRUCTIONS[language === "en" ? "en" : "fr"];
}

export function buildConversation(
  language: Locale,
  profile: InterviewRecruiterProfile,
  messages: InterviewMessage[],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const recentMessages = messages.slice(-MAX_MESSAGES);

  return [
    { role: "system", content: buildAiPrompt(language, profile) },
    ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
  ];
}
