import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CvContentUpdateRequest } from "@cvforge/types";
import { getServerApiUrl } from "../../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ applicationId: string }> },
) {
  let body: Partial<CvContentUpdateRequest>;

  try {
    body = (await request.json()) as Partial<CvContentUpdateRequest>;
  } catch {
    return NextResponse.json(
      { message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const cvContent = body.cvContent ?? null;
  const { applicationId } = await params;

  if (!cvContent) {
    return NextResponse.json(
      { message: "cvContent manquant." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const apiResponse = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/cv`,
    {
      body: JSON.stringify({ cvContent }),
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      method: "PUT",
    },
  );

  if (!apiResponse.ok) {
    let message = "La sauvegarde du CV a échoué.";

    try {
      const data = (await apiResponse.json()) as { message?: string };
      if (typeof data.message === "string") message = data.message;
    } catch {
      // ignore
    }

    const statusCode =
      apiResponse.status >= 400 && apiResponse.status < 600
        ? apiResponse.status
        : 500;
    return NextResponse.json({ message }, { status: statusCode });
  }

  const payload = (await apiResponse.json()) as {
    cvContent: CvContentUpdateRequest["cvContent"];
  };
  return NextResponse.json({
    cvContent: payload.cvContent,
    message: "CV sauvegardé.",
  });
}
