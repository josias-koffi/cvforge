import {
  labelWords,
  normalized,
  type FieldKey,
  type PrefillData,
} from "./field-match";

/**
 * The learned map of application forms (US-205). After a fill, each field
 * holding exactly one of the candidate's data teaches the map « this field
 * takes that data »; once two candidates agree, the next fills of the site
 * use it without a model. Only field shapes and data names leave the
 * browser, never a value.
 */

/** A datum of the candidate: a profile field, or a saved answer's key. */
export type DataKey = FieldKey | `answer:${string}`;

export type FormMapRule = { signature: string; fieldKey: string };

/** A field as the page shows it after the fill. */
export type FilledField = { signature: string; value: string };

/** Shortest value that can teach anything: « Oui » would match everything. */
const MIN_VALUE_CHARS = 3;
const MAX_SIGNATURE_CHARS = 300;

/**
 * A field's shape, the same for every candidate and every offer of a
 * template: tag, type, name without its ids, label words.
 */
export function fieldSignature(field: {
  tag: string;
  type?: string;
  name?: string;
  label: string;
}): string {
  const name = (field.name ?? "")
    .toLowerCase()
    .replace(/[0-9a-f]{8}(-?[0-9a-f]{4}){3}-?[0-9a-f]{12}/g, "#")
    .replace(/\d+/g, "#");
  return [
    field.tag.toLowerCase(),
    field.type ?? "",
    name,
    labelWords(field.label),
  ]
    .join(":")
    .slice(0, MAX_SIGNATURE_CHARS);
}

/** Every datum the candidate has, by key. */
export function dataByKey(data: PrefillData): [DataKey, string][] {
  return [
    ...(Object.entries(data.values) as [FieldKey, string][]),
    ...Object.entries(data.known ?? {}).map(
      ([key, value]) => [`answer:${key}`, value] as [DataKey, string],
    ),
  ].filter(([, value]) => value.trim().length >= MIN_VALUE_CHARS);
}

/** The value a learned rule gives, or null when the candidate lacks it. */
export function ruleValue(
  rules: readonly FormMapRule[],
  signature: string,
  data: PrefillData,
): string | null {
  const rule = rules.find((entry) => entry.signature === signature);
  if (!rule) return null;
  return dataByKey(data).find(([key]) => key === rule.fieldKey)?.[1] ?? null;
}

/**
 * What a filled form teaches: fields holding exactly one datum (confirmed),
 * and served rules whose field ended with something else (missed).
 */
export function learnFromForm(
  fields: readonly FilledField[],
  data: PrefillData,
  served: readonly FormMapRule[],
): { confirmed: FormMapRule[]; missed: FormMapRule[] } {
  const known = dataByKey(data).map(
    ([key, value]) => [key, normalized(value)] as const,
  );
  const confirmed: FormMapRule[] = [];
  for (const field of fields) {
    const value = normalized(field.value);
    if (value.length < MIN_VALUE_CHARS) continue;
    const keys = known.filter(([, datum]) => datum === value);
    // Two data with the same value (first name = full name): unsure.
    if (keys.length === 1) {
      confirmed.push({ fieldKey: keys[0]![0], signature: field.signature });
    }
  }
  const missed = served.filter((rule) => {
    const field = fields.find((entry) => entry.signature === rule.signature);
    const datum = known.find(([key]) => key === rule.fieldKey)?.[1];
    return (
      field !== undefined &&
      datum !== undefined &&
      normalized(field.value) !== datum
    );
  });
  return { confirmed: dedupe(confirmed), missed };
}

const dedupe = (rules: FormMapRule[]) =>
  rules.filter(
    (rule, index) =>
      rules.findIndex(
        (other) =>
          other.signature === rule.signature &&
          other.fieldKey === rule.fieldKey,
      ) === index,
  );
