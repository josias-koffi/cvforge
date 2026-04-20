import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../../auth-config";

export async function POST(request: Request) {
  const formData = await request.formData();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const redirectUrl = new URL("/admin/templates", getAppUrl());

  if (!templateId) {
    redirectUrl.searchParams.set("error", "template_missing");

    return NextResponse.redirect(redirectUrl);
  }

  const response = await fetch(
    `${getServerApiUrl()}/templates/${encodeURIComponent(templateId)}`,
    {
      headers: {
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      method: "DELETE",
    },
  );

  if (!response.ok) {
    redirectUrl.searchParams.set("error", response.status === 409 ? "template_last_default" : "template_delete_failed");

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
