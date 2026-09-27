import { SCORE_WEIGHTS, type ScoreBreakdown } from "@cvforge/types"

export interface MatchLevel {
  label: string
  /** Text colour of the label. */
  text: string
  /** Fill of the gauge. */
  bar: string
}

/**
 * "65/100" says nothing on its own: the candidate reads a verdict first, the
 * number second. Offers under 35 are never proposed, so "partielle" is the
 * floor of what they can see, not a failure.
 */
export function matchLevel(score: number): MatchLevel {
  if (score >= 75) {
    return {
      bar: "bg-emerald-500",
      label: "Très bonne correspondance",
      text: "text-emerald-700 dark:text-emerald-400",
    }
  }

  if (score >= 55) {
    return {
      bar: "bg-amber-500",
      label: "Bonne correspondance",
      text: "text-amber-700 dark:text-amber-400",
    }
  }

  return {
    bar: "bg-muted-foreground/60",
    label: "Correspondance partielle",
    text: "text-muted-foreground",
  }
}

export interface ScoreCriterion {
  key: keyof ScoreBreakdown
  label: string
  /** What the points measure, for the candidate who wonders. */
  hint: string
  weight: number
}

/** In the order the candidate cares about, heaviest first. */
export const SCORE_CRITERIA: ScoreCriterion[] = [
  {
    hint: "L'intitulé de l'offre face aux postes que vous visez",
    key: "title",
    label: "Intitulé du poste",
    weight: SCORE_WEIGHTS.title,
  },
  {
    hint: "Vos compétences retrouvées dans l'annonce",
    key: "skills",
    label: "Compétences",
    weight: SCORE_WEIGHTS.skills,
  },
  {
    hint: "La distance aux lieux de votre recherche",
    key: "location",
    label: "Lieu",
    weight: SCORE_WEIGHTS.location,
  },
  {
    hint: "Une offre récente vaut plus qu'une offre de trois semaines",
    key: "freshness",
    label: "Fraîcheur de l'offre",
    weight: SCORE_WEIGHTS.freshness,
  },
  {
    hint: "Le niveau demandé face à votre expérience",
    key: "experience",
    label: "Expérience",
    weight: SCORE_WEIGHTS.experience,
  },
  {
    hint: "Le salaire affiché face à vos attentes",
    key: "salary",
    label: "Salaire",
    weight: SCORE_WEIGHTS.salary,
  },
]

/** One line of the breakdown: points earned, out of the criterion's weight. */
export function criterionPoints(
  breakdown: ScoreBreakdown,
  criterion: ScoreCriterion
) {
  const points = Math.round(breakdown[criterion.key] ?? 0)

  return {
    percent:
      criterion.weight > 0
        ? Math.min(100, (points / criterion.weight) * 100)
        : 0,
    points,
  }
}
