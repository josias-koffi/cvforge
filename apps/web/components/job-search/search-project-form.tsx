"use client"

import { useState, useTransition } from "react"
import {
  searchExperienceLevels,
  searchRemoteModes,
  type SearchProject,
  type SearchProjectRomeAppellation,
} from "@cvforge/types"
import { SparklesIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  prefillSearchProject,
  saveSearchProject,
} from "@/app/(app)/ma-recherche/actions"
import {
  ApprenticeshipFields,
  InternshipFields,
} from "@/components/job-search/search-project-contract-fields"
import { SearchProjectAlerts } from "@/components/job-search/search-project-alerts"
import {
  ChipGroup,
  LinesTextarea,
  LocationPicker,
} from "@/components/job-search/search-project-fields"
import {
  CONTRACT_OPTIONS,
  EXPERIENCE_LABELS,
  REMOTE_LABELS,
  SECTOR_OPTIONS,
  SIZE_OPTIONS,
  VALUE_OPTIONS,
} from "@/components/job-search/search-project-options"
import { SearchProjectRome } from "@/components/job-search/search-project-rome"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

/**
 * "Ma recherche": what the candidate is looking for.
 *
 * Laid out as four questions rather than one long form — the job, the place,
 * the company, the alerts — because this is a page somebody fills in once and
 * revisits rarely, and a wall of fields is what made them give up on it.
 */
export function SearchProjectForm({
  initialProject,
  initialRome,
}: {
  initialProject: SearchProject
  initialRome: SearchProjectRomeAppellation[]
}) {
  const [project, setProject] = useState(initialProject)
  const [rome, setRome] = useState(initialRome)
  const [saving, startSaving] = useTransition()
  const [prefilling, startPrefilling] = useTransition()
  const set = <K extends keyof SearchProject>(
    key: K,
    value: SearchProject[K]
  ) => setProject((current) => ({ ...current, [key]: value }))

  const save = () =>
    startSaving(async () => {
      const result = await saveSearchProject(project)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setRome(result.rome)
      const suggested = result.rome.filter(
        (entry) => entry.status === "suggested"
      ).length
      toast.success(
        suggested > 0
          ? `${result.message} ${suggested} métier${suggested > 1 ? "s" : ""} à confirmer.`
          : result.message
      )
    })

  const prefill = () =>
    startPrefilling(async () => {
      const result = await prefillSearchProject(project.profileId)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      // The alert settings are the candidate's, not the profile's: a prefill
      // must never switch the morning e-mail on behind their back.
      setProject((current) => ({
        ...result.searchProject,
        aiRerankEnabled: current.aiRerankEnabled,
        digestEnabled: current.digestEnabled,
        emailEnabled: current.emailEnabled,
      }))
      toast.success(
        "Recherche pré-remplie depuis votre profil. Vérifiez puis enregistrez."
      )
    })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Le poste</CardTitle>
          <CardDescription>
            Ce que vous cherchez, dans les mots des annonces.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="target-roles">Postes visés</Label>
            <LinesTextarea
              id="target-roles"
              placeholder={"Développeur Full Stack\nIngénieur logiciel"}
              values={project.targetRoles}
              onChange={(next) => set("targetRoles", next)}
            />
            <p className="text-xs text-muted-foreground">
              Un intitulé par ligne. Ce sont eux qui servent à chercher.
            </p>
          </div>

          <ChipGroup
            label="Niveau d'expérience"
            options={searchExperienceLevels.map((level) => ({
              id: level,
              label: EXPERIENCE_LABELS[level],
            }))}
            selected={project.experienceLevel ? [project.experienceLevel] : []}
            onChange={(next) =>
              set(
                "experienceLevel",
                next.find((level) => level !== project.experienceLevel) ?? null
              )
            }
          />

          <ChipGroup
            label="Types de contrat"
            options={CONTRACT_OPTIONS}
            selected={project.contractTypes}
            onChange={(next) => set("contractTypes", next)}
          />

          {project.contractTypes.includes("stage") ? (
            <InternshipFields
              value={project.internship}
              onChange={(next) => set("internship", next)}
            />
          ) : null}

          {project.contractTypes.includes("alternance") ? (
            <ApprenticeshipFields
              value={project.apprenticeship}
              onChange={(next) => set("apprenticeship", next)}
            />
          ) : null}
        </CardContent>
      </Card>

      <SearchProjectRome
        profileId={project.profileId}
        appellations={rome}
        onChange={setRome}
      />

      <Card>
        <CardHeader>
          <CardTitle>Où</CardTitle>
          <CardDescription>
            Les villes que vous acceptez, et jusqu&apos;où vous êtes prêt à
            aller.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <LocationPicker
            locations={project.locations}
            onChange={(next) => set("locations", next)}
          />

          <ChipGroup
            label="Télétravail"
            options={searchRemoteModes.map((mode) => ({
              id: mode,
              label: REMOTE_LABELS[mode],
            }))}
            selected={[project.remote]}
            onChange={(next) =>
              set(
                "remote",
                next.find((mode) => mode !== project.remote) ?? "any"
              )
            }
          />

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={project.nationalMobility}
              onCheckedChange={(checked) => set("nationalMobility", checked)}
            />
            Mobile partout en France
          </label>

          <div className="flex flex-col gap-2">
            <Label htmlFor="salary-min">Salaire brut annuel minimum</Label>
            <Input
              id="salary-min"
              className="max-w-40"
              type="number"
              min={0}
              step={1000}
              placeholder="45000"
              value={project.salaryMinYearly ?? ""}
              onChange={(event) =>
                set("salaryMinYearly", Number(event.target.value) || null)
              }
            />
            <p className="text-xs text-muted-foreground">
              Facultatif. La plupart des annonces taisent le salaire : il fait
              monter une offre, il n&apos;en écarte jamais.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Les secteurs</CardTitle>
          <CardDescription>Laissez vide pour ne rien exclure.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ChipGroup
            label="Secteurs recherchés"
            options={SECTOR_OPTIONS}
            selected={project.sectors}
            onChange={(next) => set("sectors", next)}
          />
          <ChipGroup
            label="Secteurs à éviter"
            options={SECTOR_OPTIONS}
            selected={project.excludedSectors}
            onChange={(next) => set("excludedSectors", next)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Les entreprises</CardTitle>
          <CardDescription>
            Leur taille, leurs engagements, et celles que vous ne voulez pas
            voir.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ChipGroup
            label="Taille"
            options={SIZE_OPTIONS}
            selected={project.companySizes}
            onChange={(next) => set("companySizes", next)}
          />
          <ChipGroup
            label="Engagements"
            options={VALUE_OPTIONS}
            selected={project.companyValues}
            onChange={(next) => set("companyValues", next)}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="excluded-companies">Entreprises à exclure</Label>
            <LinesTextarea
              id="excluded-companies"
              placeholder={
                "Mon employeur actuel\nUne entreprise déjà contactée"
              }
              values={project.excludedCompanies}
              onChange={(next) => set("excludedCompanies", next)}
            />
            <p className="text-xs text-muted-foreground">Une par ligne.</p>
          </div>
        </CardContent>
      </Card>

      <SearchProjectAlerts project={project} onChange={set} />

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={prefilling}
            onClick={prefill}
          >
            {prefilling ? <Spinner /> : <WandSparklesIcon />}
            Pré-remplir depuis mon profil
          </Button>
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? <Spinner /> : <SparklesIcon />}
            Enregistrer ma recherche
          </Button>
        </div>
      </div>
    </div>
  )
}
