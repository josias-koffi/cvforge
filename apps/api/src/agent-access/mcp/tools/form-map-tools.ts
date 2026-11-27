import { z } from "zod";
import type { FormMapsService } from "../../form-maps/form-maps.service";
import { defineTool } from "../mcp-tool";

export type FormMapToolsDeps = {
  maps: Pick<FormMapsService, "rules" | "report">;
};

const site = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9.-]+$/i, "Un nom de site, sans chemin.");
const rule = z.object({
  fieldKey: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9:_-]+$/),
  signature: z.string().min(1).max(300),
});

/**
 * The learned map of application forms (US-205), for the JobSpark extension:
 * which field of a site's form takes which of the candidate's data. Field
 * shapes and data names only, never a candidate's value.
 */
export function formMapTools(deps: FormMapToolsDeps) {
  return [
    defineTool({
      description:
        "Carte apprise des formulaires d'un site : quel champ reçoit quelle donnée du candidat, " +
        "confirmée par au moins deux candidats. Réservé à l'extension JobSpark.",
      inputSchema: { site },
      name: "get_form_map",
      readOnly: true,
      run: async (args) => ({ rules: await deps.maps.rules(args.site) }),
      scopes: ["jobs:read"],
      title: "Carte des formulaires",
    }),
    defineTool({
      description:
        "Après un remplissage, indique quels champs ont reçu quelle donnée du candidat (noms de " +
        "données seulement, jamais de valeur). Réservé à l'extension JobSpark.",
      inputSchema: {
        aiUsed: z.boolean(),
        confirmed: z.array(rule).max(80),
        missed: z.array(rule).max(80),
        site,
      },
      name: "report_form_map",
      run: async (args, { principal }) => {
        await deps.maps.report(principal.userEmail, args);
        return { recorded: true };
      },
      scopes: ["answers:write"],
      title: "Enrichir la carte des formulaires",
    }),
  ];
}
