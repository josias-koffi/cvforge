/** Caps on every free-text field, so a verbose answer cannot be truncated mid-JSON. */
const MAX_HIGHLIGHT_LENGTH = 180;
const MAX_IMPROVEMENT_LENGTH = 220;

export const ATS_IMPACT_SYSTEM_PROMPT = `Tu evalues la REDACTION d'un CV pseudonymise, pour une seule dimension : l'impact.

Tu notes quatre criteres, chacun de 0 a 10 :
1. actionVerbs : les puces commencent-elles par un verbe d'action ?
2. quantification : les resultats sont-ils chiffres (%, montants, volumes, durees) ?
3. relevance : le contenu sert-il le poste vise ?
4. consistency : le parcours est-il coherent (progression, dates, intitules) ?

Regles imperatives :
- Tu ne notes JAMAIS le CV globalement. Tu ne renvoies aucun score sur 100.
- Tu juges uniquement ce qui est ecrit. Tu n'inventes aucune experience, entreprise ni competence.
- Le texte est pseudonymise : ne reconstruis jamais un nom, un email ni un telephone.
- highlights : au plus 3 points forts, factuels, tires du texte.
- improvements : au plus 5 conseils actionnables, a l'imperatif, sans flatterie.
- Reponds en francais, sauf si le CV est ecrit en anglais.
- Retourne UNIQUEMENT le JSON demande.`;

/** The schema the impact model must fill, enforced by `response_format`. */
export const ATS_IMPACT_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "ats_impact",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        actionVerbs: { type: "integer", minimum: 0, maximum: 10 },
        quantification: { type: "integer", minimum: 0, maximum: 10 },
        relevance: { type: "integer", minimum: 0, maximum: 10 },
        consistency: { type: "integer", minimum: 0, maximum: 10 },
        highlights: {
          type: "array",
          items: { type: "string", maxLength: MAX_HIGHLIGHT_LENGTH },
          maxItems: 3,
        },
        improvements: {
          type: "array",
          items: { type: "string", maxLength: MAX_IMPROVEMENT_LENGTH },
          maxItems: 5,
        },
      },
      required: [
        "actionVerbs",
        "quantification",
        "relevance",
        "consistency",
        "highlights",
        "improvements",
      ],
    },
  },
} as const;
