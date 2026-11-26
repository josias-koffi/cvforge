import { z } from "zod";
import {
  FORM_FILL_COST,
  type FormFillService,
} from "../../form-fill/form-fill.service";
import { defineTool } from "../mcp-tool";

export type FormFillToolsDeps = { fills: Pick<FormFillService, "start"> };

/** Opens a form fill paid in credits (US-202). */
export function formFillTools(deps: FormFillToolsDeps) {
  return [
    defineTool({
      cost: () => FORM_FILL_COST,
      description:
        `Ouvre une session de remplissage de formulaire avec le modèle IA de JobSpark ` +
        `(15 minutes, 60 appels). Coûte ${FORM_FILL_COST} crédits. Réservé à l'extension JobSpark.`,
      inputSchema: { applicationId: z.string().min(1).max(100) },
      name: "start_form_fill",
      run: (args, { principal }) =>
        deps.fills.start(principal, args.applicationId),
      scopes: ["documents:generate"],
      title: "Ouvrir un remplissage de formulaire",
    }),
  ];
}
