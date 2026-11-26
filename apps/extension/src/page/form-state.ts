/**
 * Reads the recruiter's form as the candidate sees it, and finds its final
 * button (US-198). Runs in the page. Never reads password or hidden fields.
 */

export type FormSnapshot = {
  fields: { label: string; value: string }[];
  requiredEmpty: string[];
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

function roots(
  root: Document | ShadowRoot = document,
): (Document | ShadowRoot)[] {
  const found: (Document | ShadowRoot)[] = [root];
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) found.push(...roots(element.shadowRoot));
  }
  return found;
}

/** A label's own words, without the controls nested in it. */
function ownText(element: Element | null): string {
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

const clean = (text: string | null | undefined) =>
  (text ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*\*\s*$/, "")
    .trim();

function labelOf(field: HTMLElement): string {
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
const isVisible = (element: HTMLElement) =>
  (element as HTMLInputElement).type === "file" ||
  element.getClientRects().length > 0;

export function readForm(): FormSnapshot {
  const fields: FormSnapshot["fields"] = [];
  const requiredEmpty: string[] = [];
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
        const group = field.name || label;
        const checked = root.querySelector<HTMLInputElement>(
          `input[type=radio][name="${CSS.escape(field.name)}"]:checked`,
        );
        if (radioGroups.has(group)) continue;
        radioGroups.add(group);
        if (checked)
          fields.push({ label: group, value: labelOf(checked) || "Oui" });
        else if (required) requiredEmpty.push(group);
        continue;
      }
      if (value) fields.push({ label: label || "(sans libellé)", value });
      else if (required) requiredEmpty.push(label || "(sans libellé)");
    }
  }

  const control = findSubmitControl();
  return {
    fields,
    multiStep: control === null && nextControls().length > 0,
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
  return roots()
    .flatMap((root) => [
      ...root.querySelectorAll<HTMLElement>(
        'button, input[type="submit"], input[type="button"], [role="button"]',
      ),
    ])
    .filter((element) => !(element as HTMLButtonElement).disabled);
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
