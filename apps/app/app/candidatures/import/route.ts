import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../auth-config";

function mapErrorCode(status: number) {
  switch (status) {
    case 400:
      return "invalid_input";
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
  const sourceType = String(formData.get("sourceType") ?? "url").trim();
  const offerUrl = String(formData.get("offerUrl") ?? "").trim();
  const offerText = String(formData.get("offerText") ?? "").trim();
  const redirectUrl = new URL("/candidatures", getAppUrl());

  if (sourceType === "url" && offerUrl) {
    redirectUrl.searchParams.set("url", offerUrl);
  }

  const endpoint =
    sourceType === "text"
      ? `${getServerApiUrl()}/applications/import-from-text`
      : `${getServerApiUrl()}/applications/import-from-url`;
  const body =
    sourceType === "text"
      ? JSON.stringify({ offerText })
      : JSON.stringify({ url: offerUrl });
  const response = await fetch(endpoint, {
    body,
    headers: {
      ...(request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") ?? "" }
        : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorCode = mapErrorCode(response.status);
    redirectUrl.searchParams.set(
      "error",
      errorCode === "invalid_input"
        ? sourceType === "text"
          ? "invalid_text"
          : "invalid_url"
        : errorCode,
    );

    return NextResponse.redirect(redirectUrl);
  }

  const payload = (await response.json()) as {
    application: { id: string };
  };

  redirectUrl.searchParams.delete("url");
  redirectUrl.searchParams.set("created", payload.application.id);

  return NextResponse.redirect(redirectUrl);
}
