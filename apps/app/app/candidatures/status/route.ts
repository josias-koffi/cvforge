import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../auth-config";

function mapErrorCode(status: number) {
  switch (status) {
    case 400:
      return "status_invalid";
    case 404:
      return "status_not_found";
    case 409:
      return "status_transition_forbidden";
    default:
      return "status_request_failed";
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "").trim();
  const redirectUrl = new URL("/candidatures", getAppUrl());

  if (!applicationId || !nextStatus) {
    redirectUrl.searchParams.set("error", "status_invalid");

    return NextResponse.redirect(redirectUrl);
  }

  const response = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/status`,
    {
      body: JSON.stringify({ status: nextStatus }),
      headers: {
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie") ?? "" }
          : {}),
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    redirectUrl.searchParams.set("error", mapErrorCode(response.status));

    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("statusUpdated", applicationId);

  return NextResponse.redirect(redirectUrl);
}
