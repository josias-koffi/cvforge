import {
  CREDIT_OFFER_MIN_PRICE_CENTS,
  type AdminCreditOffer,
  type CreditOfferInput,
  type CreditOfferStatus,
} from "@cvforge/types"

export type OfferLocale = "fr" | "en"

/** Editable state of the offer dialog: numbers stay strings while typing. */
export type CreditOfferFormValues = {
  credits: string
  description: Record<OfferLocale, string>
  features: Record<OfferLocale, string[]>
  name: Record<OfferLocale, string>
  price: string
  slug: string
  sortOrder: string
  status: CreditOfferStatus
}

export const offerStatusLabels: Record<CreditOfferStatus, string> = {
  active: "En vente",
  archived: "Archivée",
  draft: "Brouillon",
}

export const offerStatusVariants: Record<CreditOfferStatus, "success" | "outline" | "secondary"> = {
  active: "success",
  archived: "secondary",
  draft: "outline",
}

export function emptyOfferForm(): CreditOfferFormValues {
  return {
    credits: "",
    description: { en: "", fr: "" },
    features: { en: [""], fr: [""] },
    name: { en: "", fr: "" },
    price: "",
    slug: "",
    sortOrder: "0",
    status: "draft",
  }
}

export function offerToForm(offer: AdminCreditOffer): CreditOfferFormValues {
  return {
    credits: String(offer.credits),
    description: { ...offer.description },
    features: {
      en: offer.features.en.length ? [...offer.features.en] : [""],
      fr: offer.features.fr.length ? [...offer.features.fr] : [""],
    },
    name: { ...offer.name },
    price: (offer.priceCents / 100).toFixed(2).replace(".", ","),
    slug: offer.slug,
    sortOrder: String(offer.sortOrder),
    status: offer.status,
  }
}

/** "a-propos" from "À propos !" — a starting point the admin can edit. */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Accepts "9,99", "9.99" or "10"; returns cents or null when invalid. */
export function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null
  }

  return Math.round(Number.parseFloat(normalized) * 100)
}

export type OfferFormResult =
  | { ok: true; input: CreditOfferInput }
  | { ok: false; message: string }

/**
 * Client-side checks for immediate feedback. The API validates again and
 * stays the source of truth.
 */
export function buildOfferInput(values: CreditOfferFormValues): OfferFormResult {
  const credits = Number(values.credits)
  const priceCents = parsePriceToCents(values.price)
  const sortOrder = Number(values.sortOrder || "0")

  if (!values.name.fr.trim() || !values.name.en.trim()) {
    return { ok: false, message: "Le nom est obligatoire en français et en anglais." }
  }

  if (!Number.isInteger(credits) || credits <= 0) {
    return { ok: false, message: "Le nombre de crédits doit être un entier positif." }
  }

  if (priceCents === null || priceCents < CREDIT_OFFER_MIN_PRICE_CENTS) {
    return {
      ok: false,
      message: `Le prix doit être d'au moins ${CREDIT_OFFER_MIN_PRICE_CENTS / 100} €.`,
    }
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return { ok: false, message: "L'ordre d'affichage doit être un entier positif." }
  }

  const clean = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean)

  return {
    ok: true,
    input: {
      credits,
      description: {
        en: values.description.en.trim(),
        fr: values.description.fr.trim(),
      },
      features: { en: clean(values.features.en), fr: clean(values.features.fr) },
      name: { en: values.name.en.trim(), fr: values.name.fr.trim() },
      priceCents,
      slug: values.slug.trim() || slugify(values.name.fr),
      sortOrder,
      status: values.status,
    },
  }
}
