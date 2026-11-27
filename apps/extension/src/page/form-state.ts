/**
 * Reads the recruiter's form as the candidate sees it, and finds its final
 * button (US-198). Runs in the page. Never reads password or hidden fields.
 */

export type FormSnapshot = {
  fields: { label: string; value: string }[];
  requiredEmpty: string[];
  /** Empty fields the form does not require (files and consent boxes aside). */
  optionalEmpty: string[];
  /** The final button's text, or null when none (or several) stand out. */
  submitLabel: string | null;
  /** The visible button only moves to another step of the form. */
  multiStep: boolean;
};

const SUBMIT_TEXT =
  /\b(envoyer|soumettre|postuler|valider ma candidature|submit|send|apply)\b/i;
const NEXT_TEXT = /\b(suivant|continuer|étape suivante|next|continue)\b/i;
const SKIPPED_TYPES = new Set([
  "hidden",
  "password",
  "submit",
  "button",
  "reset",
  "image",
]);

export function roots(
  root: Document | ShadowRoot = document,
): (Document | ShadowRoot)[] {
  const found: (Document | ShadowRoot)[] = [root];
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) found.push(...roots(element.shadowRoot));
  }
  return found;
}

/** A label's own words, without the controls nested in it. */
export function ownText(element: Element | null): string {
  if (!element) return "";
  const copy = element.cloneNode(true) as Element;
  copy
    .querySelectorAll("select, option, input, textarea, button")
    .forEach((node) => node.remove());
  // Text nodes joined with spaces: <span>CV</span><span>PDF</span> is not « CVPDF ».
  const parts: string[] = [];
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    parts.push(node.textContent ?? "");
  }
  return parts.join(" ");
}

export const clean = (text: string | null | undefined) =>
  (text ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*[*✱]\s*$/, "")
    .trim();

export function labelOf(field: HTMLElement): string {
  const root = field.getRootNode() as Document | ShadowRoot;
  const byFor = field.id
    ? root.querySelector(`label[for="${CSS.escape(field.id)}"]`)?.textContent
    : null;
  const labelledBy = field
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => root.querySelector(`#${CSS.escape(id)}`)?.textContent ?? "")
    .join(" ");
  return clean(
    byFor ||
      labelledBy ||
      field.getAttribute("aria-label") ||
      ownText(field.closest("label")) ||
      field.getAttribute("placeholder") ||
      nearbyText(field) ||
      field.getAttribute("name") ||
      "",
  ).slice(0, 200);
}

/** A hidden file input's label is the block around it (« CV / Curriculum vitae »). */
function nearbyText(field: HTMLElement): string {
  let parent = field.parentElement;
  for (
    let level = 0;
    level < 3 && parent;
    level++, parent = parent.parentElement
  ) {
    const text = clean(ownText(parent).split(/\n/)[0]);
    if (text && text.length <= 80) return text;
  }
  return "";
}

function valueOf(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): string {
  if (field instanceof HTMLSelectElement) {
    return field.selectedIndex > 0 || field.value
      ? clean(field.selectedOptions[0]?.textContent)
      : "";
  }
  if (field instanceof HTMLInputElement) {
    if (field.type === "checkbox" || field.type === "radio")
      return field.checked ? "Oui" : "";
    if (field.type === "file")
      return [...(field.files ?? [])].map((file) => file.name).join(", ");
  }
  return field.value.trim();
}

// File inputs are often hidden behind a styled button: they still count.
export const isVisible = (element: HTMLElement) =>
  (element as HTMLInputElement).type === "file" ||
  element.getClientRects().length > 0;

/** The radios answering the same question as this one. */
export function radioGroup(radio: HTMLInputElement): HTMLInputElement[] {
  const root = radio.getRootNode() as Document | ShadowRoot;
  return radio.name
    ? [
        ...root.querySelectorAll<HTMLInputElement>(
          `input[type=radio][name="${CSS.escape(radio.name)}"]`,
        ),
      ]
    : [radio];
}

/**
 * The question a group of radios answers: its legend, its radiogroup label,
 * or the text of the block around the options, without the options.
 */
export function groupQuestion(radios: HTMLInputElement[]): string {
  const first = radios[0];
  if (!first) return "";
  const legend = first.closest("fieldset")?.querySelector("legend");
  if (legend) return clean(ownText(legend)).slice(0, 200);
  const group = first.closest<HTMLElement>('[role="radiogroup"]');
  if (
    group &&
    (group.getAttribute("aria-label") || group.getAttribute("aria-labelledby"))
  )
    return labelOf(group);
  let block: HTMLElement | null = first.parentElement;
  while (block && !radios.every((radio) => block!.contains(radio))) {
    block = block.parentElement;
  }
  const options = radios.map((radio) => labelOf(radio)).filter(Boolean);
  // Only a block holding these radios and nothing else speaks for them.
  const onlyThese = (element: HTMLElement) =>
    [...element.querySelectorAll("input, select, textarea")].every(
      (field) =>
        radios.includes(field as HTMLInputElement) ||
        (field as HTMLInputElement).type === "hidden",
    );
  for (
    let level = 0;
    level < 3 && block && onlyThese(block);
    level++, block = block.parentElement
  ) {
    let text = clean(ownText(block));
    for (const option of options) text = text.split(option).join(" ");
    text = clean(text);
    if (text) return text.slice(0, 200);
  }
  return "";
}

export function readForm(): FormSnapshot {
  const fields: FormSnapshot["fields"] = [];
  const requiredEmpty: string[] = [];
  const optionalEmpty: string[] = [];
  const radioGroups = new Set<string>();

  for (const root of roots()) {
    for (const field of root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea")) {
      if (field instanceof HTMLInputElement && SKIPPED_TYPES.has(field.type))
        continue;
      if (field.disabled || !isVisible(field as HTMLElement)) continue;
      const label = labelOf(field);
      const value = valueOf(field);
      const required =
        field.required || field.getAttribute("aria-required") === "true";

      if (field instanceof HTMLInputElement && field.type === "radio") {
        const key = field.name || label;
        if (radioGroups.has(key)) continue;
        radioGroups.add(key);
        const radios = radioGroup(field);
        const question = groupQuestion(radios) || key;
        const checked = radios.find((radio) => radio.checked);
        if (checked)
          fields.push({ label: question, value: labelOf(checked) || "Oui" });
        else if (radios.some((radio) => radio.required) || required)
          requiredEmpty.push(question);
        else optionalEmpty.push(question);
        continue;
      }
      if (value) fields.push({ label: label || "(sans libellé)", value });
      else if (required) requiredEmpty.push(label || "(sans libellé)");
      else if (
        !(field instanceof HTMLInputElement) ||
        !["checkbox", "file"].includes(field.type)
      )
        optionalEmpty.push(label || "(sans libellé)");
    }
  }

  const control = findSubmitControl();
  return {
    fields,
    multiStep: control === null && nextControls().length > 0,
    optionalEmpty,
    requiredEmpty,
    submitLabel: control ? controlText(control) : null,
  };
}

const controlText = (element: HTMLElement) =>
  clean(element.textContent || (element as HTMLInputElement).value || "").slice(
    0,
    80,
  );

function controls(): HTMLElement[] {
  return (
    roots()
      .flatMap((root) => [
        ...root.querySelectorAll<HTMLElement>(
          'button, input[type="submit"], input[type="button"], [role="button"]',
        ),
      ])
      .filter((element) => !(element as HTMLButtonElement).disabled)
      // A hidden button is not the one the candidate sees: Lever keeps an
      // invisible hCaptcha `type="submit"` beside « Submit application ».
      .filter((element) => element.getClientRects().length > 0)
  );
}

function nextControls() {
  return controls().filter((element) => NEXT_TEXT.test(controlText(element)));
}

/** `type="submit"` written in the page, not a button's implicit default. */
const explicitSubmit = (element: HTMLElement) =>
  element.getAttribute("type")?.toLowerCase() === "submit";

/** « Postuler avec LinkedIn » and the like apply elsewhere, not here. */
const THIRD_PARTY = /\b(linkedin|indeed|google|facebook|apple|seek|xing)\b/i;

/** The one button that sends the form; null when there is no clear one. */
export function findSubmitControl(): HTMLElement | null {
  const candidates = controls()
    .filter(
      (element) =>
        SUBMIT_TEXT.test(controlText(element)) || explicitSubmit(element),
    )
    .filter((element) => !NEXT_TEXT.test(controlText(element)))
    .filter((element) => !THIRD_PARTY.test(controlText(element)));
  if (candidates.length <= 1) return candidates[0] ?? null;
  // Several: keep the explicit submit buttons that name the action.
  const named = candidates.filter(
    (element) =>
      explicitSubmit(element) && SUBMIT_TEXT.test(controlText(element)),
  );
  return named.length === 1 ? named[0]! : null;
}

/** Clicks the final button. Only called after the candidate's validation. */
export function clickSubmit():
  | { clicked: true; label: string }
  | { clicked: false; reason: string } {
  const control = findSubmitControl();
  if (!control) {
    return {
      clicked: false,
      reason: "Bouton d'envoi introuvable ou ambigu : cliquez-le vous-même.",
    };
  }
  control.click();
  return { clicked: true, label: controlText(control) };
}
