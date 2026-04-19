import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../auth-config";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();

  const response = await fetch(`${getServerApiUrl()}/auth/passwordless/request`, {
    body: JSON.stringify({ email }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL("/login?error=request_failed", getAppUrl()));
  }

  const data = (await response.json()) as {
    email: string;
    expiresAt: string;
    sessionDurationDays: number;
  };
  const redirectUrl = new URL("/login/check-email", getAppUrl());

  redirectUrl.searchParams.set("email", data.email);
  redirectUrl.searchParams.set("expiresAt", data.expiresAt);
  redirectUrl.searchParams.set(
    "sessionDurationDays",
    String(data.sessionDurationDays),
  );

  return NextResponse.redirect(redirectUrl);
}
