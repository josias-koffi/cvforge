import Link from "next/link"

export type PageLink = { href: string; label: string }

/**
 * Links to other generated pages that exist (US-138, US-140); nothing at all
 * when there are none, so a page never shows an empty section.
 */
export function PageLinks({
  id,
  title,
  links,
}: {
  id: string
  title: string
  links: PageLink[]
}) {
  if (links.length === 0) return null

  return (
    <section aria-labelledby={id}>
      <h2 className="text-lg font-medium" id={id}>
        {title}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className="flex min-h-11 items-center rounded-lg border px-3 py-2 hover:bg-accent"
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
