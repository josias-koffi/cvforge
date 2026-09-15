import Link from "next/link"
import { ZapIcon } from "lucide-react"

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="group/brand flex items-center gap-2 font-semibold">
      <span className="relative flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-surface transition-transform duration-200 ease-spark group-hover/brand:-rotate-6">
        <ZapIcon className="size-4" strokeWidth={1.75} />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-spark ring-2 ring-sidebar motion-safe:group-hover/brand:animate-ping" />
      </span>
      <span className="text-base tracking-tight">
        CV<span className="text-primary">Spark</span>
      </span>
    </Link>
  )
}
