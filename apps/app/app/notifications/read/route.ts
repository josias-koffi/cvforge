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
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  const redirectUrl = new URL("/notifications", request.url);

  if (!notificationId) {
    redirectUrl.searchParams.set("error", "notification_missing");
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(
    `${getServerApiUrl()}/notifications/${notificationId}/read`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      method: "POST",
    },
  );

  if (!response.ok) {
    redirectUrl.searchParams.set("error", "notification_update_failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("updated", notificationId);
  return NextResponse.redirect(redirectUrl);
}
