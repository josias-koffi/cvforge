import { fieldSignature, type FilledField } from "../domain/form-map";
import {
  clean,
  groupQuestion,
  isVisible,
  labelOf,
  radioGroup,
  roots,
} from "./form-state";

/**
 * The learned map's page side (US-205): each field's shape, and what the
 * fields hold after a fill. The values go to the service worker only, which
 * keeps the data names and drops the values.
 */

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const SKIPPED = new Set([
  "hidden",
  "password",
  "submit",
  "button",
  "reset",
  "image",
  "file",
  "checkbox",
]);

export function signatureOf(field: Field): string {
  if (field instanceof HTMLInputElement && field.type === "radio") {
    return fieldSignature({
      label: groupQuestion(radioGroup(field)),
      name: field.name,
      tag: "radio",
    });
  }
  return fieldSignature({
    label: labelOf(field),
    name: field.name || field.id,
    tag: field.tagName,
    type: field instanceof HTMLInputElement ? field.type : undefined,
  });
}

/** Every visible field holding something, by shape. */
export function filledFields(): FilledField[] {
  const out: FilledField[] = [];
  const groups = new Set<string>();
  for (const root of roots()) {
    for (const field of root.querySelectorAll<Field>(
      "input, select, textarea",
    )) {
      if (field instanceof HTMLInputElement && SKIPPED.has(field.type))
        continue;
      if (field.disabled || !isVisible(field)) continue;
      let value = "";
      if (field instanceof HTMLInputElement && field.type === "radio") {
        const key = field.name || labelOf(field);
        if (groups.has(key)) continue;
        groups.add(key);
        const checked = radioGroup(field).find((radio) => radio.checked);
        value = checked ? labelOf(checked) : "";
      } else if (field instanceof HTMLSelectElement) {
        value =
          field.selectedIndex > 0
            ? clean(field.options[field.selectedIndex]?.textContent)
            : "";
      } else {
        value = field.value.trim();
      }
      if (value) out.push({ signature: signatureOf(field), value });
    }
  }
  return out;
}
