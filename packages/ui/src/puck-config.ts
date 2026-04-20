import type { Config, Fields } from "@puckeditor/core";
import type { TemplateKind } from "../../types/src";
import { documentBlockRegistry } from "./document-blocks";

export function toPuckConfig(
  registry: typeof documentBlockRegistry,
  kind: TemplateKind,
): Config {
  const components: Config["components"] = {};

  for (const [name, definition] of Object.entries(registry)) {
    if (!(definition.templateKinds as readonly TemplateKind[]).includes(kind)) {
      continue;
    }

    const fields: Fields = {};

    for (const field of definition.fields as readonly string[]) {
      const defaultValue =
        (definition.defaultProps as Record<string, unknown>)[field];

      if (Array.isArray(defaultValue)) {
        fields[field] = { type: "array", arrayFields: { _: { type: "text" } } };
      } else {
        fields[field] = { type: "text" };
      }
    }

    components[name] = {
      label: definition.label,
      defaultProps: definition.defaultProps as Record<string, unknown>,
      fields,
      render: definition.component as unknown as Config["components"][string]["render"],
    };
  }

  return { components };
}
