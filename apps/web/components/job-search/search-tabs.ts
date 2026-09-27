import {
  BarChart3Icon,
  BellIcon,
  BriefcaseBusinessIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

/**
 * The four sides of "Ma recherche", one page each: what they have in common is
 * the profile, not the way they are saved.
 */
export const SEARCH_TABS = [
  { href: "/ma-recherche", icon: SlidersHorizontalIcon, label: "Critères" },
  {
    href: "/ma-recherche/metiers",
    icon: BriefcaseBusinessIcon,
    label: "Métiers & compétences",
  },
  { href: "/ma-recherche/marche", icon: BarChart3Icon, label: "Marché" },
  { href: "/ma-recherche/alertes", icon: BellIcon, label: "Alertes" },
] as const

/** A tab's link, keeping the profile being looked at. */
export function searchTabHref(href: string, profileId: string | null) {
  return profileId ? `${href}?profileId=${encodeURIComponent(profileId)}` : href
}
