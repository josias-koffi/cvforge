import { legalPath } from "@/lib/config"

/**
 * Vision §15.1 asks for a consent checkbox naming the terms and the privacy
 * policy. Ticking a box that links to nothing is not consent to anything.
 */
export function ConsentLabel() {
  return (
    <>
      J&apos;accepte les <LegalLink document="terms">conditions d&apos;utilisation</LegalLink> et
      la <LegalLink document="privacy">politique de confidentialité</LegalLink>.
    </>
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
