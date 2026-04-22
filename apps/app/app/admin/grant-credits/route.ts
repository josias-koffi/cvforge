import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../auth-config";

function buildRedirectUrl(formData: FormData) {
  const redirectUrl = new URL("/admin", getAppUrl());
  const page = String(formData.get("page") ?? "").trim();
  const query = String(formData.get("query") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (page) {
    redirectUrl.searchParams.set("page", page);
  }

  if (query) {
    redirectUrl.searchParams.set("query", query);
  }

  if (role) {
    redirectUrl.searchParams.set("role", role);
  }

  return redirectUrl;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
  const credits = Number.parseInt(String(formData.get("credits") ?? "").trim(), 10);
  const note = String(formData.get("note") ?? "");
  const redirectUrl = buildRedirectUrl(formData);

  if (!userEmail) {
    redirectUrl.searchParams.set("error", "user_missing");

    return NextResponse.redirect(redirectUrl);
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    redirectUrl.searchParams.set("error", "credits_invalid");

    return NextResponse.redirect(redirectUrl);
  }

  const response = await fetch(`${getServerApiUrl()}/credits/admin/grants`, {
    body: JSON.stringify({
      credits,
      note,
      userEmail,
    }),
    headers: {
      ...(request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") ?? "" }
        : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    redirectUrl.searchParams.set("error", "grant_failed");
    redirectUrl.searchParams.set("granted", userEmail);

    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("granted", userEmail);

  return NextResponse.redirect(redirectUrl);
}
