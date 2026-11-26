import {
  SCREENING_ANSWER_KEYS,
  SCREENING_ANSWER_LABELS,
  SCREENING_ANSWER_MAX_LENGTH,
  SCREENING_QUESTION_MAX_LENGTH,
} from "@cvforge/types";
import { UnprocessableEntityException } from "@nestjs/common";
import { z } from "zod";
import type { ProfilesService } from "../../../profiles/profiles.service";
import type { StoredProfile } from "../../../profiles/profiles.types";
import type { ScreeningAnswersService } from "../../../profiles/screening-answers.service";
import { defineTool } from "../mcp-tool";

export type ScreeningToolsDeps = {
  answers: Pick<ScreeningAnswersService, "get" | "saveOne">;
  profiles: Pick<ProfilesService, "getRegistry">;
};

/** What a form may ask that the profile already answers. */
function profileFacts(profile: StoredProfile | undefined) {
  if (!profile) return null;
  const current = profile.sections.experiences.find((entry) => entry.current);

  return {
    availability:
      profile.preferences.availabilityMode === "immediate"
        ? "Immédiate"
        : profile.preferences.availabilityMode === "date"
          ? `À partir du ${profile.preferences.availabilityDate}`
          : null,
    city: profile.identity.city || null,
    contractTypes: profile.preferences.contractTypes || null,
    currentCompany: current?.company ?? null,
    currentRole: current?.role ?? null,
    drivingLicenses: profile.identity.drivingLicenses,
    languages: profile.sections.languages,
    links: profile.identity.links,
  };
}

/**
 * Saved answers to recruiters' screening questions (ADR-034 §5). The
 * extension fills a form with these and with the profile, and asks the
 * candidate for anything else: it never makes an answer up.
 */
export function screeningTools(deps: ScreeningToolsDeps) {
  return [
    defineTool({
      description:
        "Réponses enregistrées par le candidat aux questions des formulaires de candidature " +
        "(prétentions, préavis, visa, mobilité…), et ce que son profil répond déjà (ville, poste " +
        "actuel, permis, liens, langues, disponibilité). Une question absente d'ici se pose au " +
        "candidat : n'invente jamais de réponse.",
      inputSchema: {
        profileId: z
          .string()
          .max(100)
          .optional()
          .describe("Par défaut le profil actif"),
      },
      name: "get_screening_answers",
      readOnly: true,
      async run(args, { principal }) {
        const [answers, registry] = await Promise.all([
          deps.answers.get(principal.userEmail),
          deps.profiles.getRegistry(principal.userEmail),
        ]);
        const id = args.profileId ?? registry?.activeProfileId;
        const profile = registry?.profiles.find((entry) => entry.id === id);

        return {
          custom: answers.custom.map(({ question, answer }) => ({
            answer,
            question,
          })),
          fromProfile: profileFacts(profile),
          known: SCREENING_ANSWER_KEYS.filter((key) => answers.known[key]).map(
            (key) => ({
              answer: answers.known[key],
              key,
              label: SCREENING_ANSWER_LABELS[key].label,
            }),
          ),
          missing: SCREENING_ANSWER_KEYS.filter((key) => !answers.known[key]),
        };
      },
      scopes: ["profile:read"],
      title: "Réponses aux questions des recruteurs",
    }),
    defineTool({
      description:
        "Enregistre la réponse que le candidat vient de donner à une question d'un formulaire, " +
        "pour les prochaines candidatures. Uniquement une réponse dite par le candidat.",
      inputSchema: {
        answer: z.string().max(SCREENING_ANSWER_MAX_LENGTH),
        key: z
          .enum(SCREENING_ANSWER_KEYS)
          .optional()
          .describe("Question type connue ; sinon `question`"),
        question: z
          .string()
          .max(SCREENING_QUESTION_MAX_LENGTH)
          .optional()
          .describe("La question telle que posée par le formulaire"),
      },
      name: "save_screening_answer",
      async run(args, { principal }) {
        if (!args.key === !args.question) {
          throw new UnprocessableEntityException(
            "Donnez soit `key`, soit `question`.",
          );
        }
        await deps.answers.saveOne(principal.userEmail, args);
        return { saved: true };
      },
      scopes: ["answers:write"],
      title: "Enregistrer une réponse",
    }),
  ];
}
