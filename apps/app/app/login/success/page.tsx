import { redirect } from "next/navigation";
import { requireSession } from "../../auth/session";

export default async function LoginSuccessPage() {
  await requireSession();
  redirect("/dashboard");
}
