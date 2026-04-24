import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectUrl = new URL("/notifications", request.url);
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(`${getServerApiUrl()}/notifications/preferences`, {
    body: JSON.stringify({
      email: {
        applicationFollowUp: formData.get("applicationFollowUp") === "on",
        creditPurchaseConfirmed:
          formData.get("creditPurchaseConfirmed") === "on",
      },
    }),
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    method: "POST",
  });

  if (!response.ok) {
    redirectUrl.searchParams.set("error", "preferences_update_failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("updated", "preferences");
  return NextResponse.redirect(redirectUrl);
}
