/**
 * The page-script pass of a fill (US-203): what the candidate's data answers
 * for sure is filled in a second, without a model. Identity, links, current
 * job, saved answers, the CV and the letter. A field already filled is never
 * touched; a list or a radio is chosen only on an exact match; anything else
 * is left to the model.
 */
import {
  classifyField,
  classifyLabel,
  matchOption,
  savedAnswer,
  type PrefillData,
} from "../domain/field-match";
import { attachFile, type DocumentKind } from "./attach";
import {
  clean,
  groupQuestion,
  isVisible,
  labelOf,
  radioGroup,
  readForm,
  roots,
} from "./form-state";

export type PrefillDocument = { base64: string; name: string; mime: string };

export type PrefillReport = {
  filled: { label: string; value: string }[];
  attached: string[];
  /** Required fields still empty: the model's work. */
  remaining: string[];
  /** Empty fields the form does not require. */
  optionalEmpty: string[];
};

const TEXT_TYPES = new Set(["text", "email", "tel", "url", "search", ""]);

/** Typed into like a person would: React and Vue see the change. */
function setValue(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(field),
    "value",
  )?.set;
  if (setter) setter.call(field, value);
  else field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  field.dispatchEvent(new Event("blur", { bubbles: true }));
}

/** A search box with suggestions (country, city): picking needs the model. */
const isCombobox = (field: HTMLElement) =>
  field.getAttribute("role") === "combobox" ||
  field.getAttribute("aria-autocomplete") === "list" ||
  field.getAttribute("autocomplete") === "list";

const usable = (field: HTMLElement) =>
  !(field as HTMLInputElement).disabled &&
  !(field as HTMLInputElement).readOnly &&
  isVisible(field);

function fillText(
  field: HTMLInputElement | HTMLTextAreaElement,
  data: PrefillData,
): { label: string; value: string } | null {
  if (field.value.trim() || isCombobox(field)) return null;
  const label = labelOf(field);
  // A multi-line field may still ask for one datum (Workable: « Linkedin »).
  const key =
    field instanceof HTMLInputElement
      ? classifyField({
          autocomplete: field.getAttribute("autocomplete") ?? undefined,
          id: field.id,
          label,
          name: field.name,
          type: field.type,
        })
      : classifyLabel(label);
  const value = key ? data.values[key] : savedAnswer(label, data.answers);
  if (!value) return null;
  setValue(field, value);
  return { label, value };
}

function fillSelect(field: HTMLSelectElement, data: PrefillData) {
  if (field.selectedIndex > 0) return null;
  const label = labelOf(field);
  const answer = savedAnswer(label, data.answers);
  if (!answer) return null;
  const options = [...field.options].map((option) => clean(option.textContent));
  const index = matchOption(answer, options);
  if (index === null) return null;
  field.selectedIndex = index;
  field.dispatchEvent(new Event("change", { bubbles: true }));
  return { label, value: options[index]! };
}

function fillRadios(radios: HTMLInputElement[], data: PrefillData) {
  if (radios.some((radio) => radio.checked)) return null;
  const question = groupQuestion(radios);
  const answer = savedAnswer(question, data.answers);
  if (!answer) return null;
  const options = radios.map((radio) => labelOf(radio));
  const index = matchOption(answer, options);
  if (index === null) return null;
  radios[index]!.click();
  return { label: question, value: options[index]! };
}

export async function prefill(
  data: PrefillData,
  documents: Record<DocumentKind, PrefillDocument>,
): Promise<PrefillReport> {
  const filled: PrefillReport["filled"] = [];
  const seenGroups = new Set<string>();

  for (const root of roots()) {
    for (const field of root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea")) {
      if (!usable(field)) continue;
      let done: { label: string; value: string } | null = null;
      if (field instanceof HTMLSelectElement) done = fillSelect(field, data);
      else if (field instanceof HTMLTextAreaElement)
        done = fillText(field, data);
      else if (field.type === "radio") {
        const key = field.name || labelOf(field);
        if (seenGroups.has(key)) continue;
        seenGroups.add(key);
        done = fillRadios(radioGroup(field).filter(usable), data);
      } else if (TEXT_TYPES.has(field.type)) done = fillText(field, data);
      if (done) filled.push(done);
    }
  }

  const attached: string[] = [];
  for (const kind of ["cv", "letter"] as const) {
    const doc = documents[kind];
    const result = await attachFile({
      bytes: Uint8Array.from(atob(doc.base64), (c) => c.charCodeAt(0)),
      kind,
      name: doc.name,
      type: doc.mime,
    });
    if (result.ok) attached.push(doc.name);
  }

  const after = readForm();
  return {
    attached,
    filled,
    optionalEmpty: after.optionalEmpty,
    remaining: after.requiredEmpty,
  };
}
