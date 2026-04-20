import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../auth-config";

function mapErrorCode(status: number) {
  switch (status) {
    case 400:
      return "invalid_url";
    case 422:
      return "unprocessable";
    case 502:
      return "unreachable";
    default:
      return "request_failed";
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const offerUrl = String(formData.get("offerUrl") ?? "").trim();
  const redirectUrl = new URL("/candidatures", getAppUrl());

  if (offerUrl) {
    redirectUrl.searchParams.set("url", offerUrl);
  }

  const response = await fetch(`${getServerApiUrl()}/applications/import-from-url`, {
    body: JSON.stringify({ url: offerUrl }),
    headers: {
      ...(request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") ?? "" }
        : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    redirectUrl.searchParams.set("error", mapErrorCode(response.status));

    return NextResponse.redirect(redirectUrl);
  }

  const payload = (await response.json()) as {
    application: { id: string };
  };

  redirectUrl.searchParams.delete("url");
  redirectUrl.searchParams.set("created", payload.application.id);

  return NextResponse.redirect(redirectUrl);
}
