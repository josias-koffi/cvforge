/**
 * Wording shared by the candidate's pages and the admin screens.
 *
 * Kept away from `lib/job-search.ts`, which pulls in the server-only API
 * client: a client component importing a label from there would drag the
 * whole client into the browser bundle.
 */
export const CONTRACT_LABELS: Record<string, string> = {
  alternance: "Alternance",
  cdd: "CDD",
  cdi: "CDI",
  freelance: "Freelance",
  interim: "Intérim",
  stage: "Stage",
  unknown: "Contrat non précisé",
  vie: "VIE",
}

/**
 * Where the offer can be read, in the wording the licences require.
 *
 * France Travail's reuse licence asks for the source to be named and the
 * original advert to be linked; a company's own board is named after the
 * employer, because that is what the candidate recognises.
 *
 * Shared rather than owned by the card: the admin screens name the same
 * sources, and two lists would drift apart.
 */
export const SOURCE_LABELS: Record<string, string> = {
  adzuna: "Adzuna",
  ashby: "Site de l'entreprise",
  france_travail: "France Travail",
  greenhouse: "Site de l'entreprise",
  la_bonne_alternance: "La bonne alternance",
  lever: "Site de l'entreprise",
  personio: "Site de l'entreprise",
  recruitee: "Site de l'entreprise",
  smartrecruiters: "Site de l'entreprise",
  welcomekit: "Welcome to the Jungle",
  workable: "Site de l'entreprise",
}
