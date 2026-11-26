import {
  SUBMISSION_FIELDS_MAX,
  SUBMISSION_FIELD_TEXT_MAX,
  SUBMISSION_SCREENSHOT_MAX_BYTES,
  SUBMISSION_SCREENSHOT_TYPES,
} from "@cvforge/types";
import { z } from "zod";
import type { SubmissionsService } from "../../../applications/submissions.service";
import { defineTool } from "../mcp-tool";

export type SubmissionToolsDeps = {
  submissions: Pick<SubmissionsService, "record">;
};

const text = z.string().max(SUBMISSION_FIELD_TEXT_MAX);

/** The proof of a sent application (ADR-034 §7, US-198). */
export function submissionTools(deps: SubmissionToolsDeps) {
  return [
    defineTool({
      description:
        "Enregistre la preuve d'une candidature envoyée sur le site du recruteur : adresse du " +
        "formulaire, page de confirmation et sa capture, documents joints, champs remplis. " +
        "`confirmed` : une page de confirmation a été vue ; la candidature passe alors à « envoyée ». " +
        "Sans confirmation, elle reste un brouillon « à vérifier ».",
      inputSchema: {
        applicationId: z.string().min(1).max(100),
        confirmationUrl: z.string().url().max(2000).nullable().optional(),
        confirmed: z.boolean(),
        documents: z.array(text).max(5),
        fields: z
          .array(z.object({ label: text, value: text }))
          .max(SUBMISSION_FIELDS_MAX),
        formUrl: z.string().url().max(2000),
        screenshotBase64: z
          .string()
          .max(Math.ceil((SUBMISSION_SCREENSHOT_MAX_BYTES * 4) / 3) + 4)
          .nullable()
          .optional(),
        screenshotType: z
          .enum(SUBMISSION_SCREENSHOT_TYPES)
          .nullable()
          .optional(),
      },
      name: "record_submission",
      async run(args, { principal }) {
        const submission = await deps.submissions.record(
          principal.userEmail,
          args,
        );
        return {
          confirmed: submission.confirmed,
          submissionId: submission.id,
          submittedAt: submission.submittedAt,
        };
      },
      scopes: ["applications:write"],
      title: "Enregistrer l'envoi d'une candidature",
    }),
  ];
}
