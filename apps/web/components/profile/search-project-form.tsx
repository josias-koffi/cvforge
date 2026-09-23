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
import { toast } from "sonner"

import {
  prefillSearchProject,
  saveSearchProject,
} from "@/app/(app)/profile/search-project-actions"
import {
  ChipGroup,
  LocationPicker,
} from "@/components/profile/search-project-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
 * "Ma recherche": the structured search project behind the daily offers and
 * the contracts named in a cover letter. It saves on its own, apart from the
 * profile, because the two are written through different endpoints.
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
      // must never switch the morning email on behind their back.
      setProject((current) => ({
        ...result.searchProject,
        aiRerankEnabled: current.aiRerankEnabled,
        digestEnabled: current.digestEnabled,
        emailEnabled: current.emailEnabled,
      }))
      toast.success("Recherche pré-remplie depuis le profil. Vérifiez puis enregistrez.")
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Ce que vous cherchez. Sert à trouver vos offres du jour et à citer vos
          contrats dans la lettre de motivation.
        </p>
        <Button type="button" variant="outline" disabled={prefilling} onClick={prefill}>
          Pré-remplir depuis le profil
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="target-roles">Postes visés (un par ligne)</Label>
        <Textarea
          id="target-roles"
          rows={3}
          value={toLines(project.targetRoles)}
          onChange={(event) => set("targetRoles", fromLines(event.target.value))}
        />
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

      {project.contractTypes.includes("stage") && (
        <fieldset className="border-border flex flex-col gap-3 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">Stage</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="internship-start">Début souhaité</Label>
              <Input
                id="internship-start"
                type="date"
                value={project.internship?.startDate ?? ""}
                onChange={(event) =>
                  set("internship", {
                    durationMonths: project.internship?.durationMonths ?? null,
                    schoolLevel: project.internship?.schoolLevel ?? "",
                    startDate: event.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="internship-duration">Durée (mois)</Label>
              <Input
                id="internship-duration"
                type="number"
                min={1}
                max={36}
                value={project.internship?.durationMonths ?? ""}
                onChange={(event) =>
                  set("internship", {
                    durationMonths: Number(event.target.value) || null,
                    schoolLevel: project.internship?.schoolLevel ?? "",
                    startDate: project.internship?.startDate ?? "",
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="internship-level">Niveau d&apos;études</Label>
              <Input
                id="internship-level"
                placeholder="Bac+5"
                value={project.internship?.schoolLevel ?? ""}
                onChange={(event) =>
                  set("internship", {
                    durationMonths: project.internship?.durationMonths ?? null,
                    schoolLevel: event.target.value,
                    startDate: project.internship?.startDate ?? "",
                  })
                }
              />
            </div>
          </div>
        </fieldset>
      )}

      {project.contractTypes.includes("alternance") && (
        <fieldset className="border-border flex flex-col gap-3 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">Alternance</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="apprenticeship-start">Début souhaité</Label>
              <Input
                id="apprenticeship-start"
                type="date"
                value={project.apprenticeship?.startDate ?? ""}
                onChange={(event) =>
                  set("apprenticeship", {
                    contractKind: project.apprenticeship?.contractKind ?? "any",
                    diploma: project.apprenticeship?.diploma ?? "",
                    durationMonths: project.apprenticeship?.durationMonths ?? null,
                    rhythm: project.apprenticeship?.rhythm ?? "",
                    schoolName: project.apprenticeship?.schoolName ?? "",
                    startDate: event.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apprenticeship-rhythm">Rythme</Label>
              <Input
                id="apprenticeship-rhythm"
                placeholder="3j/2j"
                value={project.apprenticeship?.rhythm ?? ""}
                onChange={(event) =>
                  set("apprenticeship", {
                    contractKind: project.apprenticeship?.contractKind ?? "any",
                    diploma: project.apprenticeship?.diploma ?? "",
                    durationMonths: project.apprenticeship?.durationMonths ?? null,
                    rhythm: event.target.value,
                    schoolName: project.apprenticeship?.schoolName ?? "",
                    startDate: project.apprenticeship?.startDate ?? "",
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apprenticeship-diploma">Diplôme préparé</Label>
              <Input
                id="apprenticeship-diploma"
                placeholder="Master MIAGE"
                value={project.apprenticeship?.diploma ?? ""}
                onChange={(event) =>
                  set("apprenticeship", {
                    contractKind: project.apprenticeship?.contractKind ?? "any",
                    diploma: event.target.value,
                    durationMonths: project.apprenticeship?.durationMonths ?? null,
                    rhythm: project.apprenticeship?.rhythm ?? "",
                    schoolName: project.apprenticeship?.schoolName ?? "",
                    startDate: project.apprenticeship?.startDate ?? "",
                  })
                }
              />
            </div>
          </div>
        </fieldset>
      )}

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
        <Label htmlFor="salary-min">Salaire brut annuel minimum (facultatif)</Label>
        <Input
          id="salary-min"
          className="max-w-40"
          type="number"
          min={0}
          step={1000}
          value={project.salaryMinYearly ?? ""}
          onChange={(event) =>
            set("salaryMinYearly", Number(event.target.value) || null)
          }
        />
      </div>

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

      <ChipGroup
        label="Taille d'entreprise"
        options={SIZE_OPTIONS}
        selected={project.companySizes}
        onChange={(next) => set("companySizes", next)}
      />
      <ChipGroup
        label="Engagements de l'entreprise"
        options={VALUE_OPTIONS}
        selected={project.companyValues}
        onChange={(next) => set("companyValues", next)}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="excluded-companies">
          Entreprises à exclure (une par ligne)
        </Label>
        <Textarea
          id="excluded-companies"
          rows={3}
          value={toLines(project.excludedCompanies)}
          onChange={(event) =>
            set("excludedCompanies", fromLines(event.target.value))
          }
        />
      </div>

      <fieldset className="border-border flex flex-col gap-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Offres du jour</legend>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={project.digestEnabled}
            onCheckedChange={(checked) => set("digestEnabled", checked)}
          />
          Me proposer une sélection d&apos;offres chaque matin
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={project.emailEnabled}
            disabled={!project.digestEnabled}
            onCheckedChange={(checked) => set("emailEnabled", checked)}
          />
          Recevoir la sélection par e-mail
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={project.aiRerankEnabled}
            disabled={!project.digestEnabled}
            onCheckedChange={(checked) => set("aiRerankEnabled", checked)}
          />
          Classement IA, avec une explication par offre (payant en crédits)
        </label>
      </fieldset>

      <div>
        <Button type="button" disabled={saving} onClick={save}>
          Enregistrer ma recherche
        </Button>
      </div>
    </div>
  )
}
