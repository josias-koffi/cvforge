import type { Metadata } from "next"
import type { NotificationPreferencesResponse } from "@cvforge/types"

import { SearchProjectAlerts } from "@/components/job-search/search-project-alerts"
import { SearchTabBody } from "@/components/job-search/search-tab-body"
import { JobAlertPreferences } from "@/components/notifications/job-alert-preferences"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/lib/api"
import { loadSearchProject, pickAlerts } from "@/lib/search-project"
import { loadSelectedProfile } from "@/lib/selected-profile"

export const metadata: Metadata = { title: "Ma recherche · Alertes" }

/**
 * The morning selection: whether it comes, how, and what it is built from;
 * and the new-offer alerts with their AI option (US-166, US-168), which are
 * the account's, whatever the profile.
 */
export default async function SearchAlertsPage(
  props: PageProps<"/ma-recherche/alertes">
) {
  const { selected } = await loadSelectedProfile(props.searchParams)
  const [{ searchProject, rome }, preferences] = await Promise.all([
    loadSearchProject(selected.id),
    api<NotificationPreferencesResponse>("/notifications/preferences"),
  ])

  return (
    <SearchTabBody>
      <SearchProjectAlerts
        key={selected.id}
        profileId={selected.id}
        initialAlerts={pickAlerts(searchProject)}
        project={searchProject}
        confirmedJobs={
          rome.filter((entry) => entry.status === "confirmed").length
        }
        instantAlerts={
          <Card>
            <CardHeader>
              <CardTitle>Alertes nouvelles offres</CardTitle>
              <CardDescription>
                {preferences.emailDeliveryReady
                  ? "Soyez parmi les premiers à postuler. Ces réglages valent pour toutes vos recherches."
                  : "L'envoi d'e-mails n'est pas configuré sur ce serveur."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobAlertPreferences
                preferences={preferences.preferences.jobAlerts}
                disabled={!preferences.emailDeliveryReady}
              />
            </CardContent>
          </Card>
        }
      />
    </SearchTabBody>
  )
}
