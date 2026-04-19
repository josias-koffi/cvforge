import { NextResponse } from "next/server";
import { getApiUrl } from "../../auth-config";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();

  const response = await fetch(`${getApiUrl()}/auth/passwordless/request`, {
    body: JSON.stringify({ email }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL("/login?error=request_failed", request.url));
  }

  const data = (await response.json()) as {
    email: string;
    expiresAt: string;
    sessionDurationDays: number;
  };
  const redirectUrl = new URL("/login/check-email", request.url);

  redirectUrl.searchParams.set("email", data.email);
  redirectUrl.searchParams.set("expiresAt", data.expiresAt);
  redirectUrl.searchParams.set(
    "sessionDurationDays",
    String(data.sessionDurationDays),
  );

  return NextResponse.redirect(redirectUrl);
}
