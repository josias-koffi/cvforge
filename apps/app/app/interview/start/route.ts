import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { InterviewSessionStartRequest } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function POST(request: Request) {
  let body: InterviewSessionStartRequest | undefined;

  try {
    body = (await request.json()) as InterviewSessionStartRequest;
  } catch {
    body = undefined;
  }

  const profile =
    body?.profile === "aggressive" ||
    body?.profile === "passive" ||
    body?.profile === "technical" ||
    body?.profile === "behavioral"
      ? body.profile
      : "standard";
  const applicationId =
    typeof body?.applicationId === "string" ? body.applicationId.trim() : "";

  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const apiResponse = await fetch(`${getServerApiUrl()}/interviews/sessions`, {
    body: JSON.stringify({
      applicationId: applicationId || undefined,
      language: body?.language === "en" ? "en" : "fr",
      profile,
    }),
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    method: "POST",
  });

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: "Impossible de creer la session d'interview." },
      { status: apiResponse.status >= 400 ? apiResponse.status : 500 },
    );
  }

  return NextResponse.json(await apiResponse.json());
}
