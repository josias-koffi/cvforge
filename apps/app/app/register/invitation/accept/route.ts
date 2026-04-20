import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../../auth-config";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const consentAccepted = formData.get("consentAccepted") === "true";
  const errorRedirectUrl = new URL("/register/invitation", getAppUrl());

  if (token) {
    errorRedirectUrl.searchParams.set("token", token);
  }

  if (!consentAccepted) {
    errorRedirectUrl.searchParams.set("error", "consent_required");

    return NextResponse.redirect(errorRedirectUrl);
  }

  const response = await fetch(`${getServerApiUrl()}/auth/invitations/consume`, {
    body: JSON.stringify({ consentAccepted, token }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    errorRedirectUrl.searchParams.set("error", "consume_failed");

    return NextResponse.redirect(errorRedirectUrl);
  }

  const redirectUrl = new URL("/login/success", getAppUrl());
  const nextResponse = NextResponse.redirect(redirectUrl);
  const sessionCookie = response.headers.get("set-cookie");

  if (sessionCookie) {
    nextResponse.headers.set("set-cookie", sessionCookie);
  }

  return nextResponse;
}
