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
    `${getServerApiUrl()}/templates/${encodeURIComponent(templateId)}/duplicate`,
    {
      headers: {
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    redirectUrl.searchParams.set("error", "template_save_failed");

    return NextResponse.redirect(redirectUrl);
  }

  const payload = (await response.json()) as { template: { id: string } };

  redirectUrl.searchParams.set("templateId", payload.template.id);
  redirectUrl.searchParams.set("saved", "1");

  return NextResponse.redirect(redirectUrl);
}
