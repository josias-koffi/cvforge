import Link from "next/link"
import { SparklesIcon } from "lucide-react"

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <SparklesIcon className="size-4" />
      </span>
      <span className="text-base">CVForge</span>
    </Link>
  )
}
