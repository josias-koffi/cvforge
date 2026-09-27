"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { searchTabHref } from "@/components/job-search/search-tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Which profile's search is shown. A layout never sees the query string, so
 * the choice is read here, on the client; the active profile is the default.
 */
export function SearchProfileSwitcher({
  defaultProfileId,
  profiles,
}: {
  defaultProfileId: string
  profiles: Array<{ id: string; label: string }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const requested = useSearchParams().get("profileId")
  const selected = profiles.some((profile) => profile.id === requested)
    ? requested
    : defaultProfileId

  if (profiles.length < 2) return null

  return (
    <Select
      value={selected ?? undefined}
      onValueChange={(profileId) =>
        router.replace(searchTabHref(pathname, profileId))
      }
    >
      <SelectTrigger aria-label="Profil" className="min-w-48">
        <span className="text-muted-foreground">Profil :</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            {profile.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
