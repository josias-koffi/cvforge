import type { ProfileGap } from "../application/filling";
import type { IdentityField } from "../domain/fill";
import { Field, Hint } from "./ui";

const AUTOCOMPLETE: Record<IdentityField, string> = {
  email: "email",
  firstName: "given-name",
  lastName: "family-name",
  linkedin: "url",
  phone: "tel",
};
const INPUT_TYPE: Record<IdentityField, string> = {
  email: "email",
  firstName: "text",
  lastName: "text",
  linkedin: "url",
  phone: "tel",
};

/** What the profile lacks, asked once before filling, never during. */
export function IdentityGaps({
  gaps,
  values,
  onChange,
}: {
  gaps: ProfileGap[];
  values: Partial<Record<IdentityField, string>>;
  onChange: (values: Partial<Record<IdentityField, string>>) => void;
}) {
  if (gaps.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-dashed border-warning/60 bg-warning/5 p-3">
      <legend className="px-1 text-xs font-semibold text-warning">
        Il manque à votre profil
      </legend>
      <Hint>
        Donnez-les une fois : l'agent ne vous interrompra pas et les gardera
        pour les prochains formulaires. Laissez vide ce que vous ne voulez pas
        donner.
      </Hint>
      {gaps.map((gap) => (
        <Field
          key={gap.field}
          id={`identity-${gap.field}`}
          label={gap.label}
          type={INPUT_TYPE[gap.field]}
          autoComplete={AUTOCOMPLETE[gap.field]}
          value={values[gap.field] ?? ""}
          onChange={(value) => onChange({ ...values, [gap.field]: value })}
        />
      ))}
    </fieldset>
  );
}
