import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { legalPath } from "@/lib/config"

/**
 * Vision §15.1 asks for a consent checkbox naming the terms and the privacy
 * policy. Ticking a box that links to nothing is not consent to anything.
 *
 * The label is forced back to `block`: `FieldLabel` is a `flex w-fit` row, so
 * the sentence and its two links became flex items that could not wrap, and
 * the text was cut off on a narrow card instead of running onto a second line.
 * The checkbox aligns to the first line rather than to the middle of a
 * paragraph it does not know the height of.
 */
export function ConsentField({ id = "consent" }: { id?: string }) {
  return (
    <Field orientation="horizontal" className="items-start">
      <Checkbox id={id} name="consent" required className="mt-0.5 shrink-0" />
      <FieldLabel htmlFor={id} className="block w-full font-normal">
        J&apos;accepte les <LegalLink document="terms">conditions d&apos;utilisation</LegalLink>{" "}
        et la <LegalLink document="privacy">politique de confidentialité</LegalLink>.
      </FieldLabel>
    </Field>
  )
}

function LegalLink({
  document,
  children,
}: {
  document: "terms" | "privacy"
  children: string
}) {
  return (
    <a
      href={legalPath(document)}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4 hover:text-foreground"
    >
      {children}
    </a>
  )
}
