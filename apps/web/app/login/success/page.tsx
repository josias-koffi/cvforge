import { redirect } from "next/navigation"

import { requireSession } from "@/lib/session"

export default async function LoginSuccessPage() {
  await requireSession()
  redirect("/dashboard")
}
