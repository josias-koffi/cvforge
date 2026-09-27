import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { companyLogoSrc } from "@/lib/company-logo"

/**
 * The company's logo when we know it (ADR-025), its initial otherwise, so a
 * column of cards is not a column of text. The same mark on the offers and on
 * the companies: one company, one face.
 *
 * The initial also shows while the logo loads, and if it fails. `name` is
 * `null` for a company that does not give its name.
 */
export function CompanyMark({
  name,
  logoUrl,
}: {
  name: string | null
  logoUrl?: string | null
}) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?"
  const src = name ? companyLogoSrc(logoUrl) : null

  return (
    <Avatar size="lg" className="rounded-lg after:rounded-lg">
      {src ? (
        // The name is written beside it: the image adds nothing to read.
        <AvatarImage
          src={src}
          alt=""
          loading="lazy"
          className="rounded-lg bg-white object-contain p-1"
        />
      ) : null}
      <AvatarFallback className="rounded-lg bg-primary/10 font-medium text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
