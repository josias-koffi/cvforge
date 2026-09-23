"use client"

import { useState, useTransition } from "react"
import {
  searchExperienceLevels,
  searchRemoteModes,
  searchSectors,
  type SearchCompanySize,
  type SearchCompanyValue,
  type SearchContractType,
  type SearchProject,
  type SearchSectorId,
} from "@cvforge/types"
import { SparklesIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { prefillSearchProject, saveSearchProject } from "@/app/(app)/ma-recherche/actions"
import {
  ApprenticeshipFields,
  InternshipFields,
} from "@/components/job-search/search-project-contract-fields"
import {
  ChipGroup,
  LocationPicker,
} from "@/components/job-search/search-project-fields"
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
import { Textarea } from "@/components/ui/textarea"

const CONTRACT_OPTIONS: ReadonlyArray<{ id: SearchContractType; label: string }> = [
  { id: "cdi", label: "CDI" },
  { id: "cdd", label: "CDD" },
  { id: "interim", label: "Intérim" },
  { id: "freelance", label: "Freelance" },
  { id: "stage", label: "Stage" },
  { id: "alternance", label: "Alternance" },
  { id: "vie", label: "VIE" },
]

const EXPERIENCE_LABELS: Record<(typeof searchExperienceLevels)[number], string> = {
  confirme: "Confirmé (3 à 5 ans)",
  debutant: "Débutant",
  junior: "Junior (1 à 3 ans)",
  senior: "Senior (plus de 5 ans)",
}

const REMOTE_LABELS: Record<(typeof searchRemoteModes)[number], string> = {
  any: "Peu importe",
  full_remote: "100 % télétravail",
  hybrid: "Hybride",
  onsite: "Sur site",
}

const SIZE_OPTIONS: ReadonlyArray<{ id: SearchCompanySize; label: string }> = [
  { id: "tpe", label: "TPE (moins de 10)" },
  { id: "pme", label: "PME (10 à 250)" },
  { id: "eti", label: "ETI (250 à 5000)" },
  { id: "ge", label: "Grand groupe" },
]

const VALUE_OPTIONS: ReadonlyArray<{ id: SearchCompanyValue; label: string }> = [
  { id: "societe_mission", label: "Société à mission" },
  { id: "ess", label: "Économie sociale et solidaire" },
  { id: "egapro_75plus", label: "Index égalité ≥ 75" },
  { id: "bilan_ges", label: "Bilan carbone publié" },
]

const SECTOR_OPTIONS = searchSectors.map((sector) => ({
  id: sector.id as SearchSectorId,
  label: sector.label,
}))

function toLines(values: string[]) {
  return values.join("\n")
}

function fromLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * "Ma recherche": what the candidate is looking for.
 *
 * Laid out as four questions rather than one long form — the job, the place,
 * the company, the alerts — because this is a page somebody fills in once and
 * revisits rarely, and a wall of fields is what made them give up on it.
 */
export function SearchProjectForm({
  initialProject,
}: {
  initialProject: SearchProject
}) {
  const [project, setProject] = useState(initialProject)
  const [saving, startSaving] = useTransition()
  const [prefilling, startPrefilling] = useTransition()
  const set = <K extends keyof SearchProject>(key: K, value: SearchProject[K]) =>
    setProject((current) => ({ ...current, [key]: value }))

  const save = () =>
    startSaving(async () => {
      const result = await saveSearchProject(project)

      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
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
      toast.success("Recherche pré-remplie depuis votre profil. Vérifiez puis enregistrez.")
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
            <Textarea
              id="target-roles"
              rows={3}
              placeholder={"Développeur Full Stack\nIngénieur logiciel"}
              value={toLines(project.targetRoles)}
              onChange={(event) => set("targetRoles", fromLines(event.target.value))}
            />
            <p className="text-muted-foreground text-xs">
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

      <Card>
        <CardHeader>
          <CardTitle>Où</CardTitle>
          <CardDescription>
            Les villes que vous acceptez, et jusqu&apos;où vous êtes prêt à aller.
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
              set("remote", next.find((mode) => mode !== project.remote) ?? "any")
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
            <p className="text-muted-foreground text-xs">
              Facultatif. La plupart des annonces taisent le salaire : il fait
              monter une offre, il n&apos;en écarte jamais.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Les secteurs</CardTitle>
          <CardDescription>
            Laissez vide pour ne rien exclure.
          </CardDescription>
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
            Leur taille, leurs engagements, et celles que vous ne voulez pas voir.
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
            <Textarea
              id="excluded-companies"
              rows={3}
              placeholder={"Mon employeur actuel\nUne entreprise déjà contactée"}
              value={toLines(project.excludedCompanies)}
              onChange={(event) =>
                set("excludedCompanies", fromLines(event.target.value))
              }
            />
            <p className="text-muted-foreground text-xs">Une par ligne.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos offres du jour</CardTitle>
          <CardDescription>
            Une sélection chaque matin, d&apos;après tout ce qui précède.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={project.digestEnabled}
              onCheckedChange={(checked) => set("digestEnabled", checked)}
            />
            Me proposer des offres chaque matin
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={project.emailEnabled}
              disabled={!project.digestEnabled}
              onCheckedChange={(checked) => set("emailEnabled", checked)}
            />
            Recevoir la sélection par e-mail
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Switch
              className="mt-0.5"
              checked={project.aiRerankEnabled}
              disabled={!project.digestEnabled}
              onCheckedChange={(checked) => set("aiRerankEnabled", checked)}
            />
            <span className="block">
              Classement par l&apos;IA, avec une phrase par offre expliquant
              pourquoi elle vous correspond
              <span className="text-muted-foreground block text-xs">
                1 crédit par sélection, débité seulement si le classement aboutit.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 border-t px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
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
