import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LetterContentUpdateRequest } from "@cvforge/types";
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
  }: { params: { applicationId: string } | Promise<{ applicationId: string }> },
) {
  let body: Partial<LetterContentUpdateRequest>;

  try {
    body = (await request.json()) as Partial<LetterContentUpdateRequest>;
  } catch {
    return NextResponse.json(
      { message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const letterContent = body.letterContent ?? null;
  const { applicationId } = await Promise.resolve(params);

  if (!letterContent) {
    return NextResponse.json(
      { message: "letterContent manquant." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const apiResponse = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/letter`,
    {
      body: JSON.stringify({ letterContent }),
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      method: "PUT",
    },
  );

  if (!apiResponse.ok) {
    let message = "La sauvegarde de la LM a échoué.";

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
    letterContent: LetterContentUpdateRequest["letterContent"];
  };
  return NextResponse.json({
    letterContent: payload.letterContent,
    message: "LM sauvegardée.",
  });
}
