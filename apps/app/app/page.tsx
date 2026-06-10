import { redirect } from "next/navigation";
import { requireSession } from "./auth/session";

export default async function HomePage() {
  await requireSession();
  redirect("/dashboard");
}
