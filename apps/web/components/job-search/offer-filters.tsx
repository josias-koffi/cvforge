"use client"

import { SlidersHorizontalIcon } from "lucide-react"

import { useOfferSearch } from "@/components/job-search/offer-search-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CONTRACT_LABELS } from "@/lib/job-labels"
import {
  activeFilters,
  CONTRACT_FILTERS,
  contractsOf,
  PUBLISHED_WITHIN,
  toggleContract,
  withFilters,
} from "@/lib/offer-search"

/** "Toutes", as the toggle group needs a value for "no window". */
const ANY_DATE = "all"

/**
 * The criteria beside the results. Each one applies as soon as it changes —
 * a box ticked that does nothing until a button is found reads as broken.
 */
function OfferFilterFields({ idPrefix }: { idPrefix: string }) {
  const { filters, search } = useOfferSearch()
  const contracts = contractsOf(filters)

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Type de contrat</legend>
        {CONTRACT_FILTERS.map((contract) => {
          const id = `${idPrefix}-contract-${contract}`

          return (
            <div key={contract} className="flex items-center gap-2.5">
              <Checkbox
                id={id}
                checked={contracts.includes(contract)}
                onCheckedChange={() =>
                  search(toggleContract(filters, contract))
                }
              />
              <Label htmlFor={id} className="font-normal">
                {CONTRACT_LABELS[contract]}
              </Label>
            </div>
          )
        })}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={`${idPrefix}-remote`}
          className="flex flex-col items-start gap-0.5"
        >
          <span>Télétravail</span>
          <span className="text-xs font-normal text-muted-foreground">
            Postes en télétravail complet
          </span>
        </Label>
        <Switch
          id={`${idPrefix}-remote`}
          checked={filters.teletravail === "1"}
          onCheckedChange={(checked) =>
            search(
              withFilters(filters, { teletravail: checked ? "1" : undefined })
            )
          }
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Publiée depuis</legend>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
          value={filters.publiee ?? ANY_DATE}
          onValueChange={(value) => {
            // Clicking the chosen item again sends "": nothing to change.
            if (!value) return
            search(
              withFilters(filters, {
                publiee: value === ANY_DATE ? undefined : value,
              })
            )
          }}
        >
          <ToggleGroupItem value={ANY_DATE} className="min-w-0 flex-1 px-1">
            Toutes
          </ToggleGroupItem>
          {PUBLISHED_WITHIN.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              aria-label={option.chip}
              className="min-w-0 flex-1 px-1"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>
    </div>
  )
}

/** The filter column, beside the results on a wide screen. */
export function OfferFilters() {
  return (
    <aside
      aria-label="Filtres"
      className="hidden @4xl/main:sticky @4xl/main:top-[calc(var(--page-header-height,0px)+1rem)] @4xl/main:block @4xl/main:self-start"
    >
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontalIcon className="size-4" />
          Filtres
        </h2>
        <OfferFilterFields idPrefix="aside" />
      </div>
    </aside>
  )
}

/** The same filters, in a panel, where the screen has no room for a column. */
export function OfferFiltersSheet() {
  const { filters, pending } = useOfferSearch()
  // What the column holds: the words and the place are in the bar.
  const count = activeFilters(filters).filter(
    (chip) => !["q", "ville", "departement"].includes(chip.id)
  ).length

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="@4xl/main:hidden">
          <SlidersHorizontalIcon />
          Filtres
          {count > 0 ? <Badge className="ml-1">{count}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,90vw)]">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
          <SheetDescription>
            Les résultats se mettent à jour à chaque choix.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4">
          <OfferFilterFields idPrefix="sheet" />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button disabled={pending}>
              {pending ? "Recherche…" : "Voir les offres"}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
