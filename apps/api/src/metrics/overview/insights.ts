import type {
  AcquisitionFunnel,
  AiCostMetrics,
  ConversionFunnel,
  Insight,
  InsightTone,
  Kpi,
  OverviewMetrics,
} from "@cvforge/types";

/** A move this large against the previous period is worth saying. */
export const NOTABLE_CHANGE_PERCENT = 20;
/** Under this margin, a billed unit leaves too little to pay for anything else. */
export const THIN_MARGIN_PERCENT = 30;
/** A model failing or falling back this often is costing time and money. */
export const MODEL_ERROR_PERCENT = 5;
export const MODEL_FALLBACK_PERCENT = 20;
/** Days of OpenRouter balance left under which to top it up now. */
export const LOW_RUNWAY_DAYS = 14;
/** Below this many accounts or visitors, a rate says more about chance. */
export const MIN_SAMPLE = 10;
export const MAX_INSIGHTS = 6;

const TONE_ORDER: InsightTone[] = ["bad", "warn", "good", "info"];

const UNIT_LABELS: Record<string, string> = {
  cv_generation: "Un CV généré",
  cv_import: "Un import de CV",
  interview_session: "Une minute d'entretien",
  job_digest_rerank: "Un classement IA des offres",
  letter_generation: "Une lettre générée",
  offer_enrichment: "Une offre analysée",
};

const TOOL_LABELS: Record<string, string> = {
  ats: "l'analyse ATS",
  company_check: "la vérification d'entreprise",
  interview_questions: "les questions d'entretien",
  job_market: "le marché d'un métier",
  keyword_match: "le comparateur CV ↔ offre",
};

const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(cents / 100);

export type InsightInput = {
  kpis: OverviewMetrics["kpis"];
  aiCosts: Pick<AiCostMetrics, "units" | "models" | "balance" | "trackingSince">;
  funnel: ConversionFunnel;
  acquisition: AcquisitionFunnel[];
};

/** Percent change, or null when there is no previous figure to compare with. */
export function change(kpi: Kpi): number | null {
  if (kpi.previous === null || kpi.previous === 0) return null;

  return Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100);
}

/**
 * The cockpit's findings, most urgent first. Each rule is a plain reading of
 * the figures with a named threshold; nothing is guessed.
 */
export function buildInsights(input: InsightInput): Insight[] {
  const found = [
    ...trendInsights(input.kpis),
    ...marginInsights(input.aiCosts),
    ...modelInsights(input.aiCosts),
    ...runwayInsights(input.aiCosts),
    ...funnelInsights(input.funnel),
    ...acquisitionInsights(input.acquisition),
  ];

  return found
    .sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone))
    .slice(0, MAX_INSIGHTS);
}

function trendInsights(kpis: InsightInput["kpis"]): Insight[] {
  const insights: Insight[] = [];
  const revenue = change(kpis.revenueCents);
  const signups = change(kpis.signups);
  const cost = change(kpis.aiCostEurCents);

  if (revenue !== null && Math.abs(revenue) >= NOTABLE_CHANGE_PERCENT) {
    insights.push({
      detail: `${euros(kpis.revenueCents.value)} contre ${euros(kpis.revenueCents.previous ?? 0)} sur la période précédente.`,
      href: "/admin/metrics/revenus",
      id: "revenue-trend",
      title: `Chiffre d'affaires ${revenue > 0 ? "en hausse" : "en baisse"} de ${Math.abs(revenue)} %`,
      tone: revenue > 0 ? "good" : "bad",
    });
  }
  if (signups !== null && Math.abs(signups) >= NOTABLE_CHANGE_PERCENT) {
    insights.push({
      detail: `${kpis.signups.value} inscriptions contre ${kpis.signups.previous}.`,
      href: "/admin/metrics/acquisition",
      id: "signups-trend",
      title: `Inscriptions ${signups > 0 ? "en hausse" : "en baisse"} de ${Math.abs(signups)} %`,
      tone: signups > 0 ? "good" : "warn",
    });
  }
  // Costs rising faster than revenue eat the margin even when both grow.
  if (cost !== null && cost >= NOTABLE_CHANGE_PERCENT && cost > (revenue ?? 0)) {
    insights.push({
      detail: `Le coût IA progresse de ${cost} %, plus vite que le chiffre d'affaires.`,
      href: "/admin/metrics/couts-ia",
      id: "cost-trend",
      title: "Les coûts IA augmentent plus vite que les revenus",
      tone: "warn",
    });
  }

  return insights;
}

function marginInsights(aiCosts: InsightInput["aiCosts"]): Insight[] {
  return aiCosts.units
    .filter((unit) => unit.marginRate !== null && unit.units > 0)
    .filter((unit) => (unit.marginRate ?? 100) < THIN_MARGIN_PERCENT)
    .map((unit) => {
      const label = UNIT_LABELS[unit.action] ?? unit.action;
      const negative = (unit.marginRate ?? 0) < 0;

      return {
        detail: `Coût IA ${euros(unit.costPerUnitEurCents ?? 0)} pour ${euros(unit.revenuePerUnitEurCents ?? 0)} de crédits, marge ${unit.marginRate} %.`,
        href: "/admin/metrics/couts-ia",
        id: `margin-${unit.action}`,
        title: negative
          ? `${label} coûte plus qu'il ne rapporte`
          : `${label} laisse une marge faible`,
        tone: negative ? ("bad" as const) : ("warn" as const),
      };
    });
}

function modelInsights(aiCosts: InsightInput["aiCosts"]): Insight[] {
  return aiCosts.models
    .filter((model) => model.calls >= MIN_SAMPLE)
    .flatMap((model): Insight[] => {
      if ((model.errorRate ?? 0) > MODEL_ERROR_PERCENT) {
        return [{
          detail: `${model.errorRate} % d'échecs sur ${model.calls} appels.`,
          href: "/admin/metrics/couts-ia",
          id: `model-errors-${model.model}`,
          title: `${model.model} échoue souvent`,
          tone: "warn",
        }];
      }
      if ((model.fallbackRate ?? 0) > MODEL_FALLBACK_PERCENT) {
        return [{
          detail: `${model.fallbackRate} % de ses réponses viennent après l'échec du modèle principal.`,
          href: "/admin/metrics/couts-ia",
          id: `model-fallback-${model.model}`,
          title: `${model.model} sert souvent de secours`,
          tone: "info",
        }];
      }
      return [];
    });
}

function runwayInsights(aiCosts: InsightInput["aiCosts"]): Insight[] {
  const insights: Insight[] = [];
  const { runwayDays } = aiCosts.balance;

  if (runwayDays !== null && runwayDays < LOW_RUNWAY_DAYS) {
    insights.push({
      detail: `Environ ${runwayDays} jour${runwayDays > 1 ? "s" : ""} de solde OpenRouter au rythme actuel.`,
      href: "/admin/metrics/couts-ia",
      id: "runway",
      title: "Rechargez le solde OpenRouter",
      tone: "bad",
    });
  }
  if (aiCosts.trackingSince === null) {
    insights.push({
      detail: "Le coût de chaque appel IA est enregistré depuis ce déploiement ; les chiffres arriveront avec les premières générations.",
      href: "/admin/metrics/couts-ia",
      id: "tracking",
      title: "Aucun coût IA mesuré pour l'instant",
      tone: "info",
    });
  }

  return insights;
}

const FUNNEL_STEPS: Array<[keyof ConversionFunnel, keyof ConversionFunnel, string]> = [
  ["signups", "onboarded", "l'onboarding"],
  ["onboarded", "firstGeneration", "la première génération"],
  ["firstGeneration", "firstPurchase", "le premier achat"],
  ["firstPurchase", "repeatPurchase", "le réachat"],
];

/** The step that loses the largest share of the accounts that reached it. */
function funnelInsights(funnel: ConversionFunnel): Insight[] {
  const steps = FUNNEL_STEPS.filter(([from]) => funnel[from] >= MIN_SAMPLE).map(
    ([from, to, label]) => ({ label, rate: Math.round((funnel[to] / funnel[from]) * 100) }),
  );
  const weakest = steps.sort((a, b) => a.rate - b.rate)[0];
  if (!weakest) return [];

  return [{
    detail: `Seuls ${weakest.rate} % des comptes passent l'étape « ${weakest.label} ».`,
    href: "/admin/metrics/revenus",
    id: "funnel-weakest",
    title: `Le parcours perd le plus à ${weakest.label}`,
    tone: weakest.rate < 20 ? "warn" : "info",
  }];
}

/** The free tool that turns the most visitors into accounts. */
function acquisitionInsights(funnels: AcquisitionFunnel[]): Insight[] {
  const best = funnels
    .filter((funnel) => funnel.visitors >= MIN_SAMPLE && funnel.accountsActivated !== null)
    .map((funnel) => ({
      activated: funnel.accountsActivated ?? 0,
      rate: Math.round(((funnel.accountsActivated ?? 0) / funnel.visitors) * 1000) / 10,
      tool: funnel.tool,
    }))
    .filter((funnel) => funnel.activated > 0)
    .sort((a, b) => b.rate - a.rate)[0];
  if (!best) return [];

  return [{
    detail: `${best.rate} % de ses visiteurs ont créé un compte (${best.activated}).`,
    href: "/admin/metrics/acquisition",
    id: "best-tool",
    title: `L'outil qui convertit le mieux : ${TOOL_LABELS[best.tool] ?? best.tool}`,
    tone: "good",
  }];
}
