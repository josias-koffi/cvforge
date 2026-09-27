import type {
  HiringCompaniesView,
  HiringCompanyDetail,
} from "@cvforge/types"

import { api } from "@/lib/api"

const NO_SEARCH: HiringCompaniesView = {
  companies: [],
  refreshedAt: null,
  status: "no_rome",
}

/**
 * The companies La Bonne Boîte expects to hire in the search's jobs (US-119),
 * from the weekly copy. A profile never saved has no search: shown as such.
 */
export async function loadHiringCompanies(
  profileId: string
): Promise<HiringCompaniesView> {
  try {
    return await api<HiringCompaniesView>(
      `/profiles/${encodeURIComponent(profileId)}/hiring-companies`
    )
  } catch {
    return NO_SEARCH
  }
}

/**
 * One company of the search's list, with its record (US-121). Null when the
 * list no longer shows it, or the API cannot say.
 */
export async function loadHiringCompany(
  profileId: string,
  siret: string
): Promise<HiringCompanyDetail | null> {
  try {
    return await api<HiringCompanyDetail>(
      `/profiles/${encodeURIComponent(profileId)}/hiring-companies/${encodeURIComponent(siret)}`
    )
  } catch {
    return null
  }
}
