import { LATEST_APPLICATION, type DraftApplication } from "@cvforge/types"

/**
 * The application the interview setup opens on, from its `?candidature=`.
 *
 * An id, from the application's page; or "recente" from the likely interview
 * questions' magic link, whose application was created on redemption and so
 * had no id yet (US-141). The API lists applications newest first.
 */
export function preselectedApplicationId(
  candidature: string | string[] | undefined,
  applications: Pick<DraftApplication, "id">[]
): string | undefined {
  if (typeof candidature !== "string") return undefined

  return candidature === LATEST_APPLICATION ? applications[0]?.id : candidature
}
