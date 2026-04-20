import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../../auth-config";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const response = await fetch(`${getServerApiUrl()}/auth/invitations/consume`, {
    body: JSON.stringify({ token }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const redirectUrl = new URL("/register/invitation", getAppUrl());

    if (token) {
      redirectUrl.searchParams.set("token", token);
    }

    redirectUrl.searchParams.set("error", "consume_failed");

    return NextResponse.redirect(redirectUrl);
  }

  const redirectUrl = new URL("/login/success", getAppUrl());
  const nextResponse = NextResponse.redirect(redirectUrl);
  const sessionCookie = response.headers.get("set-cookie");

  if (sessionCookie) {
    nextResponse.headers.set("set-cookie", sessionCookie);
  }

  return nextResponse;
}
