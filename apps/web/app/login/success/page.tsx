import { redirect } from "next/navigation"

import { safeNextPath } from "@/lib/next-path"
import { requireSession } from "@/lib/session"

export default async function LoginSuccessPage({
  searchParams,
}: PageProps<"/login/success">) {
  await requireSession()

  // A free tool's link opens where the tool left off (US-133).
  redirect(safeNextPath((await searchParams).next) ?? "/dashboard")
}
