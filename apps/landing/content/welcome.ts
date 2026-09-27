import { WELCOME_APPLICATIONS } from "@cvforge/types"

/**
 * The sign-up gift, counted and agreed: "1 candidature offerte", "2
 * candidatures offertes". The count lives in `WELCOME_APPLICATIONS`, so the
 * copy follows it without anyone rewriting a sentence.
 */
export function welcomeApplications(singular: string, plural: string) {
  return `${WELCOME_APPLICATIONS} ${WELCOME_APPLICATIONS > 1 ? plural : singular}`
}
