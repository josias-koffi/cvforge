import type { Locale } from "./locale";

/**
 * Date à précision variable stockée en chaîne : "2022", "2022-03" ou "2022-03-15".
 * Les anciennes valeurs en texte libre restent dans les champs historiques
 * (startDate, endDate, year, period) et ne sont jamais converties d'office.
 */
export type PartialDate = string;

export interface ParsedPartialDate {
  year: number;
  month?: number;
  day?: number;
}

const PARTIAL_DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

const MONTHS: Record<Locale, readonly string[]> = {
  fr: [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ],
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
};

const PRESENT_LABEL: Record<Locale, string> = { fr: "Présent", en: "Present" };

const MONTH_ALIASES: Record<string, number> = {
  janvier: 1,
  janv: 1,
  january: 1,
  jan: 1,
  février: 2,
  fevrier: 2,
  févr: 2,
  fevr: 2,
  february: 2,
  feb: 2,
  mars: 3,
  march: 3,
  mar: 3,
  avril: 4,
  avr: 4,
  april: 4,
  apr: 4,
  mai: 5,
  may: 5,
  juin: 6,
  june: 6,
  jun: 6,
  juillet: 7,
  juil: 7,
  july: 7,
  jul: 7,
  août: 8,
  aout: 8,
  august: 8,
  aug: 8,
  septembre: 9,
  sept: 9,
  september: 9,
  sep: 9,
  octobre: 10,
  oct: 10,
  october: 10,
  novembre: 11,
  nov: 11,
  november: 11,
  décembre: 12,
  decembre: 12,
  déc: 12,
  dec: 12,
  december: 12,
};

export function getMonthNames(locale: Locale): readonly string[] {
  return MONTHS[locale];
}

export function parsePartialDate(
  value: string | undefined | null,
): ParsedPartialDate | null {
  const match = PARTIAL_DATE_PATTERN.exec((value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] === undefined ? undefined : Number(match[2]);
  const day = match[3] === undefined ? undefined : Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  if (month !== undefined && (month < 1 || month > 12)) return null;
  if (day !== undefined && month !== undefined) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) return null;
  }
  return { year, month, day };
}

export function isPartialDate(value: unknown): value is PartialDate {
  return typeof value === "string" && parsePartialDate(value) !== null;
}

export function serializePartialDate(parts: ParsedPartialDate): PartialDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (parts.month === undefined) return String(parts.year);
  if (parts.day === undefined) return `${parts.year}-${pad(parts.month)}`;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Texte localisé ; chaîne vide si la valeur n'est pas une date valide. */
export function formatPartialDate(
  value: string | undefined | null,
  locale: Locale,
): string {
  const parsed = parsePartialDate(value);
  if (!parsed) return "";
  const { year, month, day } = parsed;
  if (month === undefined) return String(year);
  const monthName = MONTHS[locale][month - 1];
  if (day === undefined) return `${monthName} ${year}`;
  if (locale === "fr") {
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }
  return `${monthName} ${day}, ${year}`;
}

export interface PeriodParts {
  start?: string;
  end?: string;
  current?: boolean;
}

/** "mars 2022 – Présent", "2019 – 2021" ; vide si aucune borne valide. */
export function formatPeriod(period: PeriodParts, locale: Locale): string {
  const start = formatPartialDate(period.start, locale);
  const end = period.current
    ? PRESENT_LABEL[locale]
    : formatPartialDate(period.end, locale);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

/** Texte à afficher : la valeur structurée si elle existe, sinon l'ancien texte libre tel quel. */
export function resolveDateText(
  structured: string | undefined | null,
  legacy: string | undefined | null,
  locale: Locale,
): string {
  return formatPartialDate(structured, locale) || (legacy ?? "");
}

export function resolvePeriodText(
  period: PeriodParts,
  legacyStart: string | undefined | null,
  legacyEnd: string | undefined | null,
  locale: Locale,
): { start: string; end: string } {
  const hasStructured = Boolean(
    period.start || period.end || period.current === true,
  );
  if (!hasStructured) return { start: legacyStart ?? "", end: legacyEnd ?? "" };
  return {
    start: formatPartialDate(period.start, locale),
    end: period.current
      ? PRESENT_LABEL[locale]
      : formatPartialDate(period.end, locale),
  };
}

/**
 * Lecture prudente d'un ancien texte libre. Renvoie null dès qu'il y a un doute :
 * l'appelant garde alors le texte tel quel.
 */
export function legacyToPartialDate(
  text: string | undefined | null,
): PartialDate | null {
  const raw = (text ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!raw) return null;
  if (isPartialDate(raw)) return raw;

  let match = /^(\d{1,2})[/.-](\d{4})$/.exec(raw);
  if (match) return checked(Number(match[2]), Number(match[1]));

  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
  if (match)
    return checked(Number(match[3]), Number(match[2]), Number(match[1]));

  match = /^([a-zéèûîôà]+)\.?\s+(\d{4})$/.exec(raw);
  if (match) {
    const month = MONTH_ALIASES[match[1]];
    return month ? checked(Number(match[2]), month) : null;
  }
  return null;
}

function checked(
  year: number,
  month?: number,
  day?: number,
): PartialDate | null {
  const candidate = serializePartialDate({ year, month, day });
  return isPartialDate(candidate) ? candidate : null;
}

/** Tri chronologique ; une date plus précise passe après la même période moins précise. */
export function comparePartialDate(a: string, b: string): number {
  const pa = parsePartialDate(a);
  const pb = parsePartialDate(b);
  if (!pa || !pb) return 0;
  return (
    pa.year - pb.year ||
    (pa.month ?? 0) - (pb.month ?? 0) ||
    (pa.day ?? 0) - (pb.day ?? 0)
  );
}

/** Dates d'une expérience à afficher : structurées si présentes, sinon texte d'origine. */
export function experienceDateTexts(
  experience: PeriodParts & { endDate: string; startDate: string },
  locale: Locale,
): { endDate: string; startDate: string } {
  const text = resolvePeriodText(
    experience,
    experience.startDate,
    experience.endDate,
    locale,
  );
  return { endDate: text.end, startDate: text.start };
}

/** Date d'une formation ou d'une certification à afficher. */
export function singleDateText(
  entry: { date?: string; year: string },
  locale: Locale,
): string {
  return resolveDateText(entry.date, entry.year, locale);
}
