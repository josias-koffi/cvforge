/**
 * The free "check an employer" tool (US-139). Kept apart from `types.ts`,
 * like its wording from `fr.ts` and `en.ts`. Its refusals are worded in
 * `ats.errors`, with every other tool's.
 */
export interface CompanyCheckDictionary {
  metaTitle: string
  metaDescription: string
  eyebrow: string
  title: string
  subtitle: string
  form: {
    label: string
    hint: string
    placeholder: string
    submit: string
    submitting: string
    privacyNote: string
  }
  results: {
    /** "{count} entreprises correspondent" */
    title: string
    /** "{query}" is what the visitor typed. */
    noMatch: string
    closed: string
    back: string
  }
  unknown: { title: string; body: string }
  sheet: {
    /** "SIREN {siren}" */
    siren: string
    closed: string
    figuresTitle: string
    headcount: string
    activity: string
    created: string
    establishments: string
    /** "Chiffre d'affaires {year}" */
    revenue: string
    /** A figure the Annuaire does not publish. */
    missing: string
    categories: Record<"PME" | "ETI" | "GE", string>
    /** NAF sections, by letter (A to U). */
    nafSections: Record<string, string>
    commitmentsTitle: string
    commitments: Record<"mission" | "ess" | "inclusive" | "ges" | "egapro", string>
    yes: string
    no: string
    /** "{score}/100 en {year}" */
    egaproScore: string
    egaproMissing: string
    employerPageTitle: string
    employerPageLink: string
    /** "{count} offres publiées" */
    employerPageOffers: string
    employerPageMissing: string
    newTab: string
    sourcesTitle: string
    sources: { annuaire: string; egapro: string; employerPage: string }
    again: string
  }
  /** A company's own page (US-140), from the refresh's copy. */
  page: {
    breadcrumbLabel: string
    /** "{name} : fiche employeur" */
    title: string
    /** "{name} : effectif, activité, engagements" */
    metaTitle: string
    /** "{name}, SIREN {siren}. {summary}" and a closing phrase. */
    metaDescription: string
    /** "Secteur : {sector} (NAF {naf})." */
    summaryActivity: string
    /** "Effectif : {headcount}." */
    summaryHeadcount: string
    /** "Créée en {year}." */
    summaryCreated: string
    sheetTitle: string
    hiringTitle: string
    /** "{job}, {city} ({department})" */
    hiringItem: string
    hiringSource: string
    sameSectorTitle: string
    /** "Données relues le {date}." */
    refreshed: string
    toolLink: string
  }
  cta: { title: string; body: string; button: string }
  lead: {
    body: string
    emailLabel: string
    emailPlaceholder: string
    consent: string
    submit: string
    submitting: string
    success: string
    successBody: string
  }
}
