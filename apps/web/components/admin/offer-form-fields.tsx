"use client"

import { creditOfferStatuses, type CreditOfferStatus } from "@cvforge/types"
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  offerStatusLabels,
  slugify,
  type CreditOfferFormValues,
  type OfferLocale,
} from "@/lib/credit-offer-form"

const LOCALES: { label: string; value: OfferLocale }[] = [
  { label: "Français", value: "fr" },
  { label: "English", value: "en" },
]

type FieldsProps = {
  onChange: (next: CreditOfferFormValues) => void
  values: CreditOfferFormValues
}

function FeatureListField({
  locale,
  onChange,
  values,
}: FieldsProps & { locale: OfferLocale }) {
  const lines = values.features[locale]
  const setLines = (next: string[]) =>
    onChange({ ...values, features: { ...values.features, [locale]: next } })
  const move = (index: number, offset: number) => {
    const next = [...lines]
    const [line] = next.splice(index, 1)
    next.splice(index + offset, 0, line)
    setLines(next)
  }

  return (
    <Field>
      <FieldLabel>Fonctionnalités affichées</FieldLabel>
      <div className="flex flex-col gap-2">
        {lines.map((line, index) => (
          <div key={index} className="flex gap-1">
            <Input
              aria-label={`Fonctionnalité ${index + 1}`}
              placeholder="Ex. Crédits sans date d'expiration"
              value={line}
              onChange={(event) =>
                setLines(lines.map((item, i) => (i === index ? event.target.value : item)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUpIcon />
              <span className="sr-only">Monter</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={index === lines.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDownIcon />
              <span className="sr-only">Descendre</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLines(lines.length > 1 ? lines.filter((_, i) => i !== index) : [""])}
            >
              <XIcon />
              <span className="sr-only">Retirer</span>
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setLines([...lines, ""])}
      >
        <PlusIcon />
        Ajouter une ligne
      </Button>
      <FieldDescription>
        Texte marketing : toutes les fonctionnalités restent accessibles à tous les acheteurs.
      </FieldDescription>
    </Field>
  )
}

function LocalizedCopyFields({ onChange, values }: FieldsProps) {
  return (
    <Tabs defaultValue="fr">
      <TabsList>
        {LOCALES.map((locale) => (
          <TabsTrigger key={locale.value} value={locale.value}>
            {locale.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {LOCALES.map(({ value: locale }) => (
        <TabsContent key={locale} value={locale}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`offer-name-${locale}`}>Nom</FieldLabel>
              <Input
                id={`offer-name-${locale}`}
                required
                value={values.name[locale]}
                onChange={(event) =>
                  onChange({ ...values, name: { ...values.name, [locale]: event.target.value } })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`offer-description-${locale}`}>Description courte</FieldLabel>
              <Textarea
                id={`offer-description-${locale}`}
                rows={2}
                value={values.description[locale]}
                onChange={(event) =>
                  onChange({
                    ...values,
                    description: { ...values.description, [locale]: event.target.value },
                  })
                }
              />
            </Field>
            <FeatureListField locale={locale} values={values} onChange={onChange} />
          </FieldGroup>
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function OfferFormFields({ isNew, onChange, values }: FieldsProps & { isNew: boolean }) {
  return (
    <FieldGroup>
      <LocalizedCopyFields values={values} onChange={onChange} />
      <FieldSet>
        <FieldLegend variant="label">Contenu et prix</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="offer-credits">Crédits inclus</FieldLabel>
            <Input
              id="offer-credits"
              type="number"
              min={1}
              required
              value={values.credits}
              onChange={(event) => onChange({ ...values, credits: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="offer-price">Prix (€)</FieldLabel>
            <Input
              id="offer-price"
              inputMode="decimal"
              placeholder="9,99"
              required
              value={values.price}
              onChange={(event) => onChange({ ...values, price: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="offer-status">Statut</FieldLabel>
            <Select
              value={values.status}
              onValueChange={(status) =>
                onChange({ ...values, status: status as CreditOfferStatus })
              }
            >
              <SelectTrigger id="offer-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creditOfferStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {offerStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="offer-sort">Ordre d&apos;affichage</FieldLabel>
            <Input
              id="offer-sort"
              type="number"
              min={0}
              value={values.sortOrder}
              onChange={(event) => onChange({ ...values, sortOrder: event.target.value })}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="offer-slug">Identifiant</FieldLabel>
          <Input
            id="offer-slug"
            placeholder={slugify(values.name.fr) || "starter"}
            value={values.slug}
            onChange={(event) => onChange({ ...values, slug: event.target.value })}
          />
          <FieldDescription>
            {isNew
              ? "Laissez vide pour le déduire du nom français."
              : "Changer l'identifiant n'affecte ni Stripe ni les achats passés."}
          </FieldDescription>
        </Field>
      </FieldSet>
    </FieldGroup>
  )
}
