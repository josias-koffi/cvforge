import { NextResponse } from "next/server";
import { getAppUrl, getServerApiUrl } from "../../../auth-config";

function toBoolean(value: FormDataEntryValue | null) {
  return value !== null;
}

function mapErrorCode(status: number) {
  switch (status) {
    case 400:
      return "template_invalid";
    case 404:
      return "template_missing";
    default:
      return "template_save_failed";
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const categories = String(formData.get("categories") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const layout = String(formData.get("layout") ?? "").trim();
  const redirectUrl = new URL("/admin/templates", getAppUrl());

  if (templateId) {
    redirectUrl.searchParams.set("templateId", templateId);
  }

  let parsedLayout: unknown;

  try {
    parsedLayout = JSON.parse(layout);
  } catch {
    redirectUrl.searchParams.set("error", "template_invalid_layout");

    return NextResponse.redirect(redirectUrl);
  }

  const endpoint = templateId
    ? `${getServerApiUrl()}/templates/${encodeURIComponent(templateId)}`
    : `${getServerApiUrl()}/templates`;
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      active: toBoolean(formData.get("active")),
      categories,
      isDefault: toBoolean(formData.get("isDefault")),
      kind: String(formData.get("kind") ?? "").trim(),
      layout: parsedLayout,
      locale: String(formData.get("locale") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
    }),
    headers: {
      ...(request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") ?? "" }
        : {}),
      "content-type": "application/json",
    },
    method: templateId ? "PUT" : "POST",
  });

  if (!response.ok) {
    redirectUrl.searchParams.set("error", mapErrorCode(response.status));

    return NextResponse.redirect(redirectUrl);
  }

  const payload = (await response.json()) as { template: { id: string } };

  redirectUrl.searchParams.set("templateId", payload.template.id);
  redirectUrl.searchParams.set("saved", "1");

  return NextResponse.redirect(redirectUrl);
}
