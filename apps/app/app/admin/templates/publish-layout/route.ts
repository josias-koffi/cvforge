import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../../auth-config";
import type { TemplateLayoutData } from "@cvforge/types";

interface PublishLayoutBody {
  templateId: string;
  layout: TemplateLayoutData;
}

export async function POST(request: Request) {
  let body: PublishLayoutBody;

  try {
    body = (await request.json()) as PublishLayoutBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!body.templateId || !body.layout) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const response = await fetch(
    `${getServerApiUrl()}/templates/${encodeURIComponent(body.templateId)}`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      body: JSON.stringify({ layout: body.layout }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: "save_failed" },
      { status: response.status >= 400 ? response.status : 500 },
    );
  }

  return NextResponse.json({ ok: true, templateId: body.templateId });
}
