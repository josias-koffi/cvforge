import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../../auth-config";

export async function POST(request: Request) {
  const formData = await request.formData();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const active = formData.get("active") === "true";
  const redirectUrl = new URL("/admin/templates", getAppUrl());

  if (!templateId) {
    redirectUrl.searchParams.set("error", "template_missing");

    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("templateId", templateId);

  const response = await fetch(
    `${getServerApiUrl()}/templates/${encodeURIComponent(templateId)}`,
    {
      body: JSON.stringify({ active }),
      headers: {
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie") ?? "" }
          : {}),
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  if (!response.ok) {
    redirectUrl.searchParams.set("error", "template_save_failed");

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
